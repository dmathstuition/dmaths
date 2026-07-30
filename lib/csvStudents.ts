// Parse and validate a spreadsheet of students for bulk import. Pure and
// dependency-free so the parsing rules are testable without a database.
//
// Accepts a header row (case/space-insensitive) with these columns; only
// first name, last name and email are required:
//   first name, last name, email, level, guardian email, guardian name, phone

export type StudentRow = {
  first_name: string;
  last_name: string;
  email: string;
  level: string;
  guardian_email: string;
  guardian_name: string;
  phone: string;
};

export type ParsedCsv = {
  rows: StudentRow[];
  errors: { line: number; reason: string }[];
};

// Minimal RFC-4180-ish line splitter: handles quoted fields and commas/newlines
// inside quotes, and "" as an escaped quote.
function splitRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
    else field += c;
  }
  // last field / row (unless the file ended on a newline)
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_]+/g, " ");

// Map a header cell to our field key, tolerating common variants.
const HEADER_ALIASES: Record<string, keyof StudentRow> = {
  "first name": "first_name", "firstname": "first_name", "first": "first_name",
  "last name": "last_name", "lastname": "last_name", "last": "last_name", "surname": "last_name",
  "email": "email", "email address": "email", "student email": "email",
  "level": "level", "class": "level", "grade": "level",
  "guardian email": "guardian_email", "parent email": "guardian_email",
  "guardian name": "guardian_name", "parent name": "guardian_name",
  "phone": "phone", "phone number": "phone", "mobile": "phone",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseStudentsCsv(text: string): ParsedCsv {
  const grid = splitRows(text).filter((r) => r.some((c) => c.trim() !== ""));
  if (!grid.length) return { rows: [], errors: [{ line: 0, reason: "The file is empty." }] };

  const header = grid[0].map((h) => HEADER_ALIASES[norm(h)]);
  if (!header.includes("first_name") || !header.includes("last_name") || !header.includes("email")) {
    return { rows: [], errors: [{ line: 1, reason: "The header row must include First name, Last name and Email columns." }] };
  }

  const rows: StudentRow[] = [];
  const errors: { line: number; reason: string }[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const get = (k: keyof StudentRow) => {
      const idx = header.indexOf(k);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };

    const email = get("email").toLowerCase();
    const first = get("first_name");
    const last = get("last_name");
    const line = i + 1; // 1-based, counting the header

    if (!first || !last) { errors.push({ line, reason: "Missing first or last name." }); continue; }
    if (!EMAIL_RE.test(email)) { errors.push({ line, reason: `"${email || "(blank)"}" isn't a valid email.` }); continue; }
    if (seen.has(email)) { errors.push({ line, reason: `Duplicate of ${email} earlier in the file.` }); continue; }
    seen.add(email);

    const guardianEmail = get("guardian_email").toLowerCase();
    if (guardianEmail && !EMAIL_RE.test(guardianEmail)) {
      errors.push({ line, reason: `Guardian email "${guardianEmail}" isn't valid.` }); continue;
    }

    rows.push({
      first_name: first,
      last_name: last,
      email,
      level: get("level"),
      guardian_email: guardianEmail,
      guardian_name: get("guardian_name"),
      phone: get("phone"),
    });
  }

  return { rows, errors };
}

// A ready-to-paste example, used by the UI's "download template" hint.
export const CSV_TEMPLATE =
  "First name,Last name,Email,Level,Guardian email,Guardian name,Phone\n" +
  "Ada,Obi,ada.obi@example.com,JSS 2,mum.obi@example.com,Mrs Obi,08030000000\n";
