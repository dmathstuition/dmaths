// What a learner may change about their own profile. Deliberately a safe subset:
// their class/year group, subjects, school and contact/guardian details. Never
// their email, code, marks, rewards, role or active status. Pure so the
// validation is unit-testable; the API applies the returned patch with the
// service role.
import { normalizeSubjects, type AcademySubject } from "@/lib/subjects";

export const EDITABLE_LEVELS = ["Primary", "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

export function isValidLevel(level: string): boolean {
  return level === "" || EDITABLE_LEVELS.includes(level);
}

export type ProfileEdit = {
  level: string;
  subjects: AcademySubject[];
  school: string;
  phone: string;
  dob: string | null;
  address: string;
  guardian_name: string;
  guardian_contact: string;
};

// Validate + trim a learner's submitted edits. Returns { patch } on success or
// { error } with a friendly message. `dob` is normalised to null when blank;
// subjects are constrained to the academy's canonical list.
export function sanitizeProfileEdit(input: any): { patch: ProfileEdit | null; error?: string } {
  const level = String(input?.level ?? "").trim();
  if (!isValidLevel(level)) return { patch: null, error: "Pick a valid class / year group." };

  const subjects = normalizeSubjects(input?.subjects);
  if (!subjects.length) return { patch: null, error: "Pick at least one subject." };

  const dobRaw = String(input?.dob ?? "").trim();
  if (dobRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
    return { patch: null, error: "Date of birth must be a real date." };
  }

  const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  return {
    patch: {
      level,
      subjects,
      school: s(input?.school, 120),
      phone: s(input?.phone, 40),
      dob: dobRaw || null,
      address: s(input?.address, 200),
      guardian_name: s(input?.guardian_name, 120),
      guardian_contact: s(input?.guardian_contact, 60),
    },
  };
}
