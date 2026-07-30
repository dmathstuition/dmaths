import { describe, it, expect } from "vitest";
import { parseStudentsCsv } from "@/lib/csvStudents";

describe("parseStudentsCsv", () => {
  it("parses a clean file with the documented columns", () => {
    const csv = [
      "First name,Last name,Email,Level,Guardian email,Guardian name,Phone",
      "Ada,Obi,ada@example.com,JSS 2,mum@example.com,Mrs Obi,08030000000",
    ].join("\n");
    const { rows, errors } = parseStudentsCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      first_name: "Ada", last_name: "Obi", email: "ada@example.com", level: "JSS 2",
      guardian_email: "mum@example.com", guardian_name: "Mrs Obi", phone: "08030000000",
    });
  });

  it("accepts header aliases and any column order", () => {
    const csv = "surname,firstname,e-mail\nObi,Ada,ada@example.com";
    // "e-mail" isn't an alias; expect it to fail the required-header check.
    expect(parseStudentsCsv(csv).rows).toEqual([]);

    const ok = "Surname,First,Email address\nObi,Ada,ada@example.com";
    const { rows } = parseStudentsCsv(ok);
    expect(rows[0]).toMatchObject({ first_name: "Ada", last_name: "Obi", email: "ada@example.com" });
  });

  it("lowercases the email and only requires name + email", () => {
    const { rows } = parseStudentsCsv("First name,Last name,Email\nAda,Obi,ADA@Example.com");
    expect(rows[0].email).toBe("ada@example.com");
    expect(rows[0].level).toBe("");
  });

  it("collects a reason per bad row and keeps the good ones", () => {
    const csv = [
      "First name,Last name,Email",
      "Ada,Obi,ada@example.com",   // ok
      "Ben,,ben@example.com",       // missing last name
      "Cleo,Eze,not-an-email",      // bad email
      "Dupe,One,ada@example.com",   // duplicate of row 2
    ].join("\n");
    const { rows, errors } = parseStudentsCsv(csv);
    expect(rows.map((r) => r.email)).toEqual(["ada@example.com"]);
    expect(errors.map((e) => e.line)).toEqual([3, 4, 5]);
    expect(errors[0].reason).toMatch(/name/i);
    expect(errors[1].reason).toMatch(/valid email/i);
    expect(errors[2].reason).toMatch(/duplicate/i);
  });

  it("rejects a guardian email that's present but malformed", () => {
    const csv = "First name,Last name,Email,Guardian email\nAda,Obi,ada@example.com,nope";
    const { rows, errors } = parseStudentsCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/guardian email/i);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const csv = 'First name,Last name,Email,Guardian name\n"Ada","Obi","ada@example.com","Obi, Sr. ""Snr"""';
    const { rows } = parseStudentsCsv(csv);
    expect(rows[0].guardian_name).toBe('Obi, Sr. "Snr"');
  });

  it("ignores blank lines and CRLF endings", () => {
    const csv = "First name,Last name,Email\r\nAda,Obi,ada@example.com\r\n\r\n";
    const { rows, errors } = parseStudentsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("errors clearly on an empty file or a missing required header", () => {
    expect(parseStudentsCsv("").errors[0].reason).toMatch(/empty/i);
    expect(parseStudentsCsv("name,age\nAda,12").errors[0].reason).toMatch(/header row must include/i);
  });
});
