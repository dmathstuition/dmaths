import { Icon } from "@/components/Icons";

export default function NoChildren() {
  return (
    <div className="card flex flex-col items-center gap-2 py-14 text-center text-ink/45">
      <Icon name="students" className="h-8 w-8" />
      <p className="text-sm">No student is linked to your account yet.</p>
      <p className="text-[13px]">
        Contact <a href="mailto:dmathstuition@gmail.com" className="font-semibold text-gold-deep underline">dmathstuition@gmail.com</a> to get set up.
      </p>
    </div>
  );
}
