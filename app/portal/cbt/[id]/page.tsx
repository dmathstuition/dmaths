import { supabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CBTClient from "@/components/portal/CBTClient";

export const dynamic = "force-dynamic";

export default async function CBTPage({ params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) redirect("/login");
  const supa = supabaseServer();

  const { data: sub } = await supa
    .from("assignment_submissions")
    .select("*, assignment:assignments(*)")
    .eq("id", params.id)
    .eq("student_id", user.id)
    .single();

  if (!sub || !sub.assignment?.cbt_questions?.length) {
    redirect("/portal/assignments");
  }

  // Check if already submitted
  if (sub.status !== "pending") {
    redirect("/portal/assignments");
  }

  // Check CBT window
  const now = new Date();
  const a = sub.assignment;
  if (a.cbt_open && now < new Date(a.cbt_open)) redirect("/portal/assignments");
  if (a.cbt_close && now > new Date(a.cbt_close)) redirect("/portal/assignments");

  return (
    <CBTClient
      submission={{ id: sub.id }}
      questions={a.cbt_questions}
      assignmentTitle={a.title}
      subject={a.subject}
    />
  );
}
