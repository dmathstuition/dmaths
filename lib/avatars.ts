// Character-mascot avatars. Learners pick one in Avatar Studio; until they do,
// they get a stable, "random" mascot derived from their id (so it never changes
// between visits). Admins get the suited mascot. Tutors/parents fall back to the
// initials avatar (returns undefined here).
//
// If a file is missing, <Avatar> / <Mascot> fall back gracefully (initials or an
// SVG), so this is safe to ship before the images land.

export type Character = { key: string; name: string; src: string };

// ─────────────────────────────────────────────────────────────────────────
//  THE CHARACTER CATALOG — the single source of truth.
//
//  TO ADD A NEW AVATAR:
//   1. Put the PNG in /public/avatars  (square, transparent background works best).
//   2. Add ONE line below: a short unique `key`, a display `name`, and the `src`.
//  It then appears in Avatar Studio automatically and can be equipped. Never
//  reuse or rename an existing `key` — that's what a learner's choice is saved as.
// ─────────────────────────────────────────────────────────────────────────
export const CHARACTERS: Character[] = [
  { key: "wave",   name: "Waver",   src: "/avatars/student-wave.png" },   // waving boy, blue hoodie
  { key: "laptop", name: "Coder",   src: "/avatars/student-laptop.png" }, // boy at a laptop, thumbs up
  { key: "book",   name: "Reader",  src: "/avatars/student-book.png" },   // boy reading a maths book
  { key: "girl",   name: "Scholar", src: "/avatars/student-girl.png" },   // waving girl, purple hoodie
  // ── Add more here, e.g.:
  // { key: "rocket", name: "Rocket", src: "/avatars/rocket.png" },
];

// The deterministic pool (every character is a possible "random" default).
export const LEARNER_AVATARS = CHARACTERS.map((c) => c.src);

export const ADMIN_AVATAR = "/avatars/admin.png"; // suited man
export const LOGIN_MASCOT = "/avatars/student-wave.png";
export const BUDDY_MASCOT = "/avatars/student-laptop.png";

// Stable string hash → index, so a learner always gets the same default mascot.
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function learnerAvatar(id: string | null | undefined): string {
  const pool = LEARNER_AVATARS.length ? LEARNER_AVATARS : ["/avatars/student-wave.png"];
  return pool[hash(String(id ?? "")) % pool.length];
}

// A learner's chosen character (from Avatar Studio), falling back to the stable
// deterministic pick when they haven't chosen one (or the key no longer exists).
export function learnerAvatarFor(id: string | null | undefined, choice: string | null | undefined): string {
  const chosen = CHARACTERS.find((c) => c.key === choice);
  return chosen ? chosen.src : learnerAvatar(id);
}

// The mascot for a person, by role. undefined → use the initials avatar.
export function avatarForRole(role: string | null | undefined, id: string | null | undefined): string | undefined {
  if (role === "admin") return ADMIN_AVATAR;
  if (role === "student") return learnerAvatar(id);
  return undefined;
}
