"use client";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import type { WeekBucket } from "@/lib/analytics";

// Weekly learning-activity volume — practice rounds + mock exams per week,
// stacked. Colours match the dashboard charts (blue = practice, gold = mock).
const BLUE = "#1A60AB";
const GOLD = "#C8881F";
const TICK = { fill: "#8A93A6", fontSize: 11 } as const;
const TOOLTIP_STYLE = {
  borderRadius: 12, border: "1px solid #E5E5E0", fontSize: 12,
  boxShadow: "0 8px 24px rgba(26,96,171,.12)",
} as const;

export default function EngagementChart({ data }: { data: WeekBucket[] }) {
  const empty = data.every((d) => d.practice === 0 && d.mock === 0);
  if (empty) {
    return <p className="py-12 text-center text-sm text-ink/40">No practice or mock-exam activity yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#E8E8E4" />
        <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
        <YAxis tick={TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="practice" name="Practice" stackId="a" fill={BLUE} radius={[0, 0, 0, 0]} maxBarSize={30} />
        <Bar dataKey="mock" name="Mock exams" stackId="a" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={30} />
      </BarChart>
    </ResponsiveContainer>
  );
}
