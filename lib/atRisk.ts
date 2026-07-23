// Turns a learner's current metrics into an "at-risk" assessment so staff can
// intervene early. Pure + deterministic (unit-tested). Thresholds are gated so
// brand-new learners with no history (0% score/attendance) aren't falsely flagged.

export type RiskInput = {
  avgScore: number;        // profile.avg_score (0 = no assessments yet)
  attendance: number;      // profile.attendance % (0 = no attendance history yet)
  overdue: number;         // count of pending assignments whose due date has passed
  sanctionPoints: number;  // profile.sanction_points (absolute magnitude)
};

export type RiskLevel = "high" | "medium" | "low" | "none";
export type RiskResult = { level: RiskLevel; score: number; reasons: string[] };

export function assessRisk(i: RiskInput): RiskResult {
  const reasons: string[] = [];
  let score = 0;

  // Academic performance (only when there is score history).
  if (i.avgScore > 0 && i.avgScore < 40) { reasons.push(`Low average — ${i.avgScore}%`); score += 3; }
  else if (i.avgScore > 0 && i.avgScore < 55) { reasons.push(`Below-par average — ${i.avgScore}%`); score += 2; }

  // Attendance (only when there is attendance history).
  if (i.attendance > 0 && i.attendance < 60) { reasons.push(`Poor attendance — ${i.attendance}%`); score += 3; }
  else if (i.attendance > 0 && i.attendance < 75) { reasons.push(`Slipping attendance — ${i.attendance}%`); score += 1; }

  // Overdue work.
  if (i.overdue >= 3) { reasons.push(`${i.overdue} overdue assignments`); score += 3; }
  else if (i.overdue >= 1) { reasons.push(`${i.overdue} overdue assignment${i.overdue > 1 ? "s" : ""}`); score += 1; }

  // Behaviour.
  const sanctions = Math.abs(i.sanctionPoints);
  if (sanctions >= 6) { reasons.push(`Behaviour concerns — ${sanctions} sanction pts`); score += 2; }

  const level: RiskLevel = score >= 5 ? "high" : score >= 3 ? "medium" : score >= 1 ? "low" : "none";
  return { level, score, reasons };
}
