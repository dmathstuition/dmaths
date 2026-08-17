// Shared, stable colour per assignment (keyed by subject) so the admin, tutor
// and learner assignment lists all read as the same wall of colourful cards.
// Pure so the hashing is unit-testable; the icon name is consumed by <Icon/>.

export type AssignmentColor = { from: string; to: string; icon: string };

export const ASSIGNMENT_CARD_COLORS: AssignmentColor[] = [
  { from: "#1A60AB", to: "#0A2A4F", icon: "assignments" },
  { from: "#7C3AED", to: "#4C1D95", icon: "book" },
  { from: "#0E9488", to: "#0B4A44", icon: "sigma" },
  { from: "#EA580C", to: "#7C2D12", icon: "code" },
  { from: "#DC2626", to: "#7F1D1D", icon: "target" },
  { from: "#059669", to: "#064E3B", icon: "checkCircle" },
  { from: "#C8881F", to: "#8A5E12", icon: "graduationCap" },
];

export function assignmentColor(subject: string): AssignmentColor {
  let h = 0;
  for (const ch of String(subject || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ASSIGNMENT_CARD_COLORS[h % ASSIGNMENT_CARD_COLORS.length];
}
