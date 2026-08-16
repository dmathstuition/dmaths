import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Convenience entry so the learner's nav can link to a fixed path — sends them to
// their own engagement report.
export default async function MyReportRedirect() {
  const me = await getProfile();
  redirect(me?.id ? `/report/${me.id}` : "/portal");
}
