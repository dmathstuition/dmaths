// D-Maths serves learners in Nigeria, the UK and the US. Each region has its own
// class/level names and the exams learners prepare for (including UK external &
// professional exams). Kept pure so the registration form, the submit API and
// the approval flow share one taxonomy.

export type Region = { code: string; name: string; flag: string; levels: string[]; exams: string[] };

export const REGIONS: Region[] = [
  {
    code: "NG", name: "Nigeria", flag: "🇳🇬",
    levels: ["Primary 4", "Primary 5", "Primary 6", "JSS 1", "JSS 2", "JSS 3", "SSS 1", "SSS 2", "SSS 3", "Post Secondary"],
    exams: ["Common Entrance", "BECE", "WAEC (WASSCE)", "NECO", "JAMB (UTME)", "Post-UTME", "IELTS / TOEFL"],
  },
  {
    code: "UK", name: "United Kingdom", flag: "🇬🇧",
    levels: ["Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13", "Undergraduate"],
    exams: ["11+", "KS2 SATs", "GCSE", "A-Level", "BTEC", "IELTS", "ACCA", "CIMA", "CFA", "Other professional"],
  },
  {
    code: "US", name: "United States", flag: "🇺🇸",
    levels: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "College"],
    exams: ["SSAT", "PSAT", "SAT", "ACT", "AP", "GED", "GRE", "GMAT"],
  },
];

export const DEFAULT_REGION = "NG";

// Every exam across all regions, de-duplicated — used to tag question-bank
// questions so mocks can prefer questions matching a learner's exam target.
export const ALL_EXAMS: string[] = Array.from(new Set(REGIONS.flatMap((r) => r.exams)));

export function regionByCode(code: string | null | undefined): Region {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}

export function levelsFor(code: string | null | undefined): string[] {
  return regionByCode(code).levels;
}

export function examsFor(code: string | null | undefined): string[] {
  return regionByCode(code).exams;
}

// Whether a level string belongs to a region — used to reset the picker when the
// region changes so a UK "Year 10" can't stick under Nigeria.
export function isKnownLevel(code: string | null | undefined, level: string | null | undefined): boolean {
  return !!level && levelsFor(code).includes(level);
}
