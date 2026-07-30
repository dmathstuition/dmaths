// Character-mascot avatars. The user uploads five PNGs to /public/avatars.
// Learners get a stable, "random" mascot derived from their id (so it never
// changes between visits); admins get the suited mascot. Tutors/parents fall
// back to the initials avatar (returns undefined here).
//
// If a file is missing, <Avatar> / <Mascot> fall back gracefully (initials or
// an SVG), so this is safe to ship before the images land.

export const LEARNER_AVATARS = [
  "/avatars/student-wave.png",   // waving boy, blue hoodie
  "/avatars/student-laptop.png", // boy at a laptop, thumbs up
  "/avatars/student-book.png",   // boy reading a maths book
  "/avatars/student-girl.png",   // waving girl, purple hoodie
];
export const ADMIN_AVATAR = "/avatars/admin.png"; // suited man
export const LOGIN_MASCOT = "/avatars/student-wave.png";
export const BUDDY_MASCOT = "/avatars/student-laptop.png";

// Stable string hash → index, so a learner always gets the same mascot.
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function learnerAvatar(id: string | null | undefined): string {
  return LEARNER_AVATARS[hash(String(id ?? "")) % LEARNER_AVATARS.length];
}

// The mascot for a person, by role. undefined → use the initials avatar.
export function avatarForRole(role: string | null | undefined, id: string | null | undefined): string | undefined {
  if (role === "admin") return ADMIN_AVATAR;
  if (role === "student") return learnerAvatar(id);
  return undefined;
}
