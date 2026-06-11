// Server-side bridge to the Apps Script email relay.
// The secret never reaches the browser.
export async function sendEmail(template: string, to: string, data: Record<string, any>) {
  try {
    const res = await fetch(process.env.EMAIL_RELAY_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.EMAIL_RELAY_SECRET, template, to, data }),
      redirect: "follow", // Apps Script redirects POST responses
    });
    const json = await res.json().catch(() => ({ ok: false }));
    if (!json.ok) console.warn("email relay failed:", template, json.error);
    return json.ok === true;
  } catch (e) {
    console.warn("email relay error:", e);
    return false;
  }
}
