import StyleClient from "@/components/portal/StyleClient";
import { getProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Avatar Studio — pick a character (free) and unlock/equip a name TITLE with
// reward points. All economy checks run in /api/cosmetics (service role); this
// just hands the client the learner's current selection.
export default async function StylePage() {
  const me = await getProfile();
  return (
    <StyleClient
      meId={me?.id ?? ""}
      name={`${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim() || "You"}
      initialCharacter={(me as any)?.avatar_choice ?? null}
      initialTitle={(me as any)?.avatar_title ?? "none"}
    />
  );
}
