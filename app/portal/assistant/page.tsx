import AssistantPageClient from "@/components/portal/AssistantPageClient";

export const dynamic = "force-dynamic";

// The full-page D-Maths A.I with saved chat history. The floating widget stays
// available everywhere; this is the roomier home for longer conversations.
export default function AssistantPage() {
  return <AssistantPageClient />;
}
