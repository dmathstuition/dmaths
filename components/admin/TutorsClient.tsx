"use client";
import { useState, useEffect } from "react";
import { useToast } from "@/components/Toast";
import AdminThread from "@/components/admin/AdminThread";

// Human-readable label for an audit_log action in the tutor activity feed.
const ACTION_LABEL: Record<string, string> = {
  reward_given: "Gave a reward",
  log_behaviour: "Logged behaviour",
  delete_behaviour_log: "Removed a behaviour entry",
  assignment_created: "Created an assignment",
  grade_assignment: "Graded a submission",
  material_posted: "Posted a material",
  recording_added: "Added a class recording",
  recording_cleared: "Removed a class recording",
};

type Tutor = { id: string; first_name: string; last_name: string; email: string };
type Student = { id: string; first_name: string; last_name: string; level: string };

export default function TutorsClient({ initialTutors, students, initialLinks, initialSelected }: {
  initialTutors: Tutor[];
  students: Student[];
  initialLinks: Record<string, string[]>; // tutorId -> [studentId]
  initialSelected?: string;
}) {
  const push = useToast();
  const [tutors, setTutors] = useState<Tutor[]>(initialTutors);
  const [links, setLinks] = useState<Record<string, string[]>>(initialLinks);
  const [selected, setSelected] = useState<string | null>(
    initialSelected && initialTutors.some(t => t.id === initialSelected)
      ? initialSelected
      : initialTutors[0]?.id ?? null,
  );

  // Create-tutor form
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "" });
  const [creating, setCreating] = useState(false);
  const [creds, setCreds] = useState<{ email: string; tempPassword: string; loginUrl: string } | null>(null);

  const [addStudent, setAddStudent] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Activity summary for the selected tutor.
  const [activity, setActivity] = useState<any | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);

  useEffect(() => {
    if (!selected) { setActivity(null); return; }
    setLoadingActivity(true);
    setActivity(null);
    fetch(`/api/tutors/activity?tutorId=${selected}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setActivity(j); })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, [selected]);

  const selectedTutor = tutors.find(t => t.id === selected) || null;
  const assignedIds = selected ? (links[selected] ?? []) : [];
  const assigned = students.filter(s => assignedIds.includes(s.id));
  const available = students.filter(s => !assignedIds.includes(s.id));

  async function createTutor() {
    if (!form.email.trim()) { push("Enter the tutor's email.", "error"); return; }
    setCreating(true);
    setCreds(null);
    const res = await fetch("/api/tutors/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) { push(json.error || "Could not create tutor.", "error"); return; }
    if (json.alreadyTutor) { push("That tutor already exists.", "success"); return; }

    // Add to the list and select them.
    const newTutor: Tutor = {
      id: json.tutorId, first_name: form.firstName || "Tutor", last_name: form.lastName || "", email: form.email.trim().toLowerCase(),
    };
    setTutors(prev => [...prev, newTutor]);
    setLinks(prev => ({ ...prev, [newTutor.id]: [] }));
    setSelected(newTutor.id);
    setCreds(json.credentials);
    setForm({ email: "", firstName: "", lastName: "" });
    push(json.emailed ? "Tutor created and emailed their login." : "Tutor created — copy their login below.", "success");
  }

  // Regenerate a temp password for an existing tutor (self-healing create).
  async function resetPassword() {
    if (!selectedTutor) return;
    setResetting(true);
    setCreds(null);
    const res = await fetch("/api/tutors/create", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: selectedTutor.email,
        firstName: selectedTutor.first_name,
        lastName: selectedTutor.last_name,
      }),
    });
    const json = await res.json();
    setResetting(false);
    if (!res.ok) { push(json.error || "Could not reset the password.", "error"); return; }
    setCreds(json.credentials);
    window.scrollTo({ top: 0, behavior: "smooth" }); // the credentials panel is at the top
    push("New login generated — share it with the tutor.", "success");
  }

  async function deleteTutor() {
    if (!selectedTutor) return;
    if (!window.confirm(`Delete ${selectedTutor.first_name} ${selectedTutor.last_name}? This removes their account and unassigns their classes.`)) return;
    setDeleting(true);
    const res = await fetch("/api/tutors/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId: selectedTutor.id }),
    });
    const json = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) { push(json.error || "Could not delete the tutor.", "error"); return; }
    const remaining = tutors.filter(t => t.id !== selectedTutor.id);
    setTutors(remaining);
    setSelected(remaining[0]?.id ?? null);
    setCreds(null);
    push("Tutor deleted.", "success");
  }

  async function assign(studentId: string, action: "add" | "remove") {
    if (!selected) return;
    setAssigning(true);
    const res = await fetch("/api/tutors/assign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tutorId: selected, studentId, action }),
    });
    setAssigning(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); push(j.error || "Could not update.", "error"); return; }
    setLinks(prev => {
      const cur = prev[selected] ?? [];
      return { ...prev, [selected]: action === "add" ? [...cur, studentId] : cur.filter(id => id !== studentId) };
    });
    setAddStudent("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Tutors</h1>
        <p className="text-sm text-ink/50">Create tutor accounts, assign learners and classes, and message them directly.</p>
      </div>

      {/* Create a tutor */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold">Add a tutor</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="field max-w-xs" type="email" placeholder="tutor@example.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          <input className="field max-w-[160px]" placeholder="First name"
            value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
          <input className="field max-w-[160px]" placeholder="Last name"
            value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
          <button className="btn-gold !min-h-[42px]" onClick={createTutor} disabled={creating}>
            {creating ? "Creating…" : "Create tutor"}
          </button>
        </div>
        {creds && (
          <div className="mt-3 space-y-1 rounded-xl border border-gold/40 bg-gold-pale/60 p-4 text-sm">
            <p className="font-bold text-gold-deep">Share these login details with the tutor:</p>
            <p><span className="text-ink/50">Email:</span> <span className="font-mono">{creds.email}</span></p>
            <p><span className="text-ink/50">Temp password:</span> <span className="font-mono">{creds.tempPassword}</span></p>
            <button className="btn-ghost !min-h-[34px] mt-1 text-xs"
              onClick={() => { navigator.clipboard.writeText(`Login: ${creds.loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.tempPassword}`); push("Copied!", "success"); }}>
              Copy login details
            </button>
          </div>
        )}
      </div>

      {tutors.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink/45">No tutors yet. Add one above.</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          {/* Tutor list */}
          <div className="space-y-1.5">
            {tutors.map(t => (
              <button key={t.id} onClick={() => { setSelected(t.id); setCreds(null); }}
                className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                  selected === t.id ? "bg-gold text-board shadow" : "bg-chalk text-ink/70 hover:bg-chalk/70"}`}>
                {t.first_name} {t.last_name}
                <span className="block truncate text-[11px] font-normal opacity-60">{t.email}</span>
              </button>
            ))}
          </div>

          {/* Selected tutor detail */}
          {selectedTutor && (
            <div className="space-y-5">
              {/* Assigned learners */}
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold">
                  Learners for {selectedTutor.first_name}
                </h2>
                <p className="text-xs text-ink/45">
                  Directly-assigned learners. Learners in classes you assign to this tutor also appear on their portal automatically.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <select className="field max-w-xs" value={addStudent} onChange={e => setAddStudent(e.target.value)}>
                    <option value="">Add a learner…</option>
                    {available.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.level})</option>
                    ))}
                  </select>
                  <button className="btn-ghost !min-h-[42px]" disabled={!addStudent || assigning}
                    onClick={() => addStudent && assign(addStudent, "add")}>Add</button>
                </div>
                <div className="mt-4 space-y-2 border-t border-line pt-4">
                  {assigned.length === 0 && <p className="text-sm text-ink/35">No learners assigned directly yet.</p>}
                  {assigned.map(s => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl bg-chalk px-4 py-2.5 text-sm">
                      <span className="font-semibold text-ink">{s.first_name} {s.last_name} <span className="font-normal text-ink/45">· {s.level}</span></span>
                      <button onClick={() => assign(s.id, "remove")} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity summary */}
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold">Activity</h2>
                {loadingActivity && <p className="mt-2 text-sm text-ink/40">Loading…</p>}
                {activity && (
                  <>
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      <ActivityStat label="Learners" value={activity.summary.learners} />
                      <ActivityStat label="Classes" value={activity.summary.classes} />
                      <ActivityStat label="Materials" value={activity.summary.materials} />
                      <ActivityStat label="Rewards" value={activity.summary.rewards} />
                      <ActivityStat label="Behaviour" value={activity.summary.behaviour} />
                      <ActivityStat label="Assignments" value={activity.summary.assignments} />
                      <ActivityStat label="Graded" value={activity.summary.graded} />
                      <ActivityStat label="Direct" value={activity.summary.directLearners} />
                    </div>
                    <div className="mt-4 space-y-1.5 border-t border-line pt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/35">Recent actions</p>
                      {activity.recent.length === 0 && <p className="text-sm text-ink/35">No recorded activity yet.</p>}
                      {activity.recent.map((r: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-ink/70">{ACTION_LABEL[r.action] ?? r.action}</span>
                          <span className="shrink-0 text-xs text-ink/35">
                            {new Date(r.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-ink/35">Counts reflect recent activity (last 40 logged actions).</p>
                  </>
                )}
              </div>

              {/* Account controls */}
              <div className="card p-6">
                <h2 className="font-display text-lg font-semibold">Account</h2>
                <p className="text-xs text-ink/45">
                  If a tutor can't log in, reset their password to get fresh credentials. Deleting frees the email for reuse.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-ghost !min-h-[40px]" onClick={resetPassword} disabled={resetting}>
                    {resetting ? "Resetting…" : "Reset password"}
                  </button>
                  <button className="btn-danger !min-h-[40px]" onClick={deleteTutor} disabled={deleting}>
                    {deleting ? "Deleting…" : "Delete tutor"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink/40">{selectedTutor.email}</p>
              </div>

              {/* Message the tutor */}
              <div className="card p-6">
                <h2 className="mb-3 font-display text-lg font-semibold">Message {selectedTutor.first_name}</h2>
                <AdminThread ownerId={selectedTutor.id} ownerName={selectedTutor.first_name} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-chalk px-3 py-2 text-center">
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">{label}</p>
    </div>
  );
}
