/**
 * ════════════════════════════════════════════════════════════════
 *  D-MATHS EMAIL RELAY (Google Apps Script)
 *
 *  This script does ONE job: send emails. All data now lives in
 *  Supabase — your old Sheets read/write endpoints are retired.
 *
 *  SETUP:
 *  1. script.google.com → New project → paste this file.
 *  2. Replace EMAIL_SECRET with a long random string (64+ chars).
 *     Use the SAME value as EMAIL_RELAY_SECRET in your Vercel env.
 *  3. Deploy → New deployment → Web app
 *       Execute as:  Me
 *       Who has access:  Anyone
 *  4. Copy the /exec URL into EMAIL_RELAY_URL in Vercel.
 *
 *  SECURITY: the secret travels inside the POST body over HTTPS and
 *  only your server (Next.js API routes) knows it. The browser never
 *  calls this URL.
 *
 *  QUOTA: consumer Gmail = 100 emails/day, Google Workspace = 1,500.
 *  If you outgrow that, swap lib/email.ts for Resend (free 3k/month).
 * ════════════════════════════════════════════════════════════════
 */

const EMAIL_SECRET = 'change-me-to-a-64-char-random-string';
const FROM_NAME = 'D-Maths Tuition Centre';
const REPLY_TO = 'dmathstuition@gmail.com';

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'bad json' }); }

  if (!body || body.secret !== EMAIL_SECRET) {
    return json_({ ok: false, error: 'unauthorized' });
  }

  const { template, to, data } = body;
  if (!to || !template) return json_({ ok: false, error: 'missing fields' });

  const t = TEMPLATES[template];
  if (!t) return json_({ ok: false, error: 'unknown template' });

  try {
    const { subject, html } = t(data || {});
    GmailApp.sendEmail(to, subject, '', {
      htmlBody: wrap_(html),
      name: FROM_NAME,
      replyTo: REPLY_TO,
    });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ── Templates ────────────────────────────────────────────────────
const TEMPLATES = {
  credentials: (d) => ({
    subject: '🎓 Welcome to D-Maths — Your Portal Login',
    html:
      '<h2 style="color:#0A1F3D">Welcome, ' + esc_(d.firstName) + '!</h2>' +
      '<p>Your enrolment has been approved. Here are your portal credentials:</p>' +
      '<table style="border-collapse:collapse;margin:16px 0">' +
      row_('Student ID', '<code>' + esc_(d.studentCode) + '</code>') +
      row_('Email', esc_(d.email)) +
      row_('Temporary password', '<code>' + esc_(d.tempPassword) + '</code>') +
      '</table>' +
      '<p><a href="' + esc_(d.loginUrl) + '" style="background:#E8841C;color:#06152B;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Sign in to your portal →</a></p>' +
      '<p style="color:#64748B;font-size:13px">Please change your password after first sign-in (Profile → Change password).</p>',
  }),

  rejected: (d) => ({
    subject: 'D-Maths — Update on your enrolment application',
    html:
      '<h2 style="color:#0A1F3D">Hello ' + esc_(d.firstName) + ',</h2>' +
      '<p>Unfortunately we could not approve your enrolment application at this time.</p>' +
      (d.reason ? '<p><strong>Reason:</strong> ' + esc_(d.reason) + '</p>' : '') +
      '<p>If you believe this is a mistake, reply to this email or call +234 70 2567 4894.</p>',
  }),

  graded: (d) => ({
    subject: '📝 Your assignment "' + esc_(d.title) + '" has been graded',
    html:
      '<h2 style="color:#0A1F3D">Hi ' + esc_(d.firstName) + ',</h2>' +
      '<p>Your work on <strong>' + esc_(d.title) + '</strong> (' + esc_(d.subject) + ') was graded:</p>' +
      '<p style="font-size:28px;font-weight:bold;color:#E8841C">' + esc_(d.grade) + ' / 100</p>' +
      (d.feedback ? '<p><strong>Tutor feedback:</strong> ' + esc_(d.feedback) + '</p>' : '') +
      '<p><a href="' + esc_(d.loginUrl) + '">View it in your portal →</a></p>',
  }),

  reward: (d) => ({
    subject: '⭐ You earned a reward from D-Maths!',
    html:
      '<h2 style="color:#0A1F3D">Well done, ' + esc_(d.firstName) + '!</h2>' +
      '<p style="font-size:22px">' + '★'.repeat(Number(d.stars) || 0) + '</p>' +
      '<p>' + esc_(d.message) + '</p>' +
      '<p><a href="' + esc_(d.loginUrl) + '">View your progress →</a></p>',
  }),

  notice: (d) => ({
    subject: '🔔 D-Maths announcement: ' + esc_(d.title),
    html:
      '<h2 style="color:#0A1F3D">' + esc_(d.title) + '</h2>' +
      '<p>' + esc_(d.body) + '</p>' +
      '<p><a href="' + esc_(d.loginUrl) + '">Open your portal →</a></p>',
  }),

  contact_received: (d) => ({
    subject: '📬 New website message from ' + esc_(d.name),
    html:
      '<p><strong>From:</strong> ' + esc_(d.name) + ' (' + esc_(d.email) + (d.phone ? ', ' + esc_(d.phone) : '') + ')</p>' +
      '<p><strong>Subject:</strong> ' + esc_(d.subject) + '</p>' +
      '<p>' + esc_(d.message) + '</p>',
  }),

  parent_credentials: (d) => ({
    subject: '👪 Your D-Maths Parent Portal Login',
    html:
      '<h2 style="color:#0A1F3D">Hello ' + esc_(d.parentName) + ',</h2>' +
      '<p>Your child <strong>' + esc_(d.studentName) + '</strong> (' + esc_(d.studentCode) + ') has been enrolled at D-Maths Tuition Centre.</p>' +
      '<p>A parent portal account has been created so you can track their progress at any time — grades, attendance, behaviour, and assignments.</p>' +
      '<table style="border-collapse:collapse;margin:16px 0">' +
      row_('Email', esc_(d.email)) +
      row_('Temporary password', '<code>' + esc_(d.tempPassword) + '</code>') +
      '</table>' +
      '<p><a href="' + esc_(d.loginUrl) + '" style="background:#E8841C;color:#06152B;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Sign in to parent portal →</a></p>' +
      '<p style="color:#64748B;font-size:13px">Please change your password after first sign-in. If you have more than one child with D-Maths, the same login will show all of them.</p>',
  }),

  guardian_invite: (d) => ({
    subject: '👪 Parent access to ' + esc_(d.studentName) + '’s D-Maths progress',
    html:
      '<h2 style="color:#0A1F3D">Hello,</h2>' +
      '<p>You have been given a private parent view of <strong>' + esc_(d.studentName) + '</strong>’s progress at D-Maths Tuition Centre.</p>' +
      '<p>It shows grades, attendance, behaviour points and recent assignments — all read-only. No account or password is needed; just open the link below.</p>' +
      '<p style="margin:22px 0"><a href="' + esc_(d.portalUrl) + '" style="background:#E8841C;color:#06152B;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">View ' + esc_(d.studentName) + '’s progress →</a></p>' +
      '<p style="color:#64748B;font-size:13px">Keep this link private — anyone with it can see your child’s dashboard. The link expires after 90 days; reply to this email if you need a new one.</p>',
  }),

  weekly_report: (d) => {
    const greeting = d.isGuardian
      ? '<h2 style="color:#0A1F3D">Weekly update for ' + esc_(d.studentName) + '</h2>'
      : '<h2 style="color:#0A1F3D">Hi ' + esc_(d.firstName) + ', here’s your week</h2>';
    const intro = d.isGuardian
      ? '<p>Here is this week’s summary for ' + esc_(d.studentName) + ' at D-Maths Tuition Centre.</p>'
      : '<p>Here is a quick summary of your week at D-Maths Tuition Centre.</p>';
    return {
      subject: '📊 D-Maths weekly report' + (d.isGuardian ? ' — ' + esc_(d.studentName) : ''),
      html:
        greeting +
        intro +
        '<h3 style="color:#0A1F3D;margin:18px 0 4px">This week</h3>' +
        '<table style="border-collapse:collapse;margin:8px 0">' +
        row_('Reward points earned', '<span style="color:#16A34A;font-weight:bold">+' + esc_(d.weeklyRewardPts) + '</span>') +
        row_('Sanction points', '<span style="color:#DC2626;font-weight:bold">' + esc_(d.weeklySanctionPts) + '</span>') +
        row_('Positive notes', esc_(d.positiveCount)) +
        row_('Concerns logged', esc_(d.negativeCount)) +
        row_('Assignments graded', esc_(d.gradedCount)) +
        '</table>' +
        '<h3 style="color:#0A1F3D;margin:18px 0 4px">All-time totals</h3>' +
        '<table style="border-collapse:collapse;margin:8px 0">' +
        row_('Reward points', '<span style="color:#16A34A;font-weight:bold">+' + esc_(d.rewardPoints) + '</span>') +
        row_('Sanction points', '<span style="color:#DC2626;font-weight:bold">' + esc_(d.sanctionPoints) + '</span>') +
        '</table>' +
        '<p style="margin:22px 0"><a href="' + esc_(d.loginUrl) + '" style="background:#E8841C;color:#06152B;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Open the portal →</a></p>',
    };
  },
};

// ── Helpers ──────────────────────────────────────────────────────
function wrap_(inner) {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">' +
    '<div style="font-size:22px;font-weight:bold;color:#E8841C;margin-bottom:18px">D-Maths <span style="font-size:11px;color:#94A3B8;letter-spacing:2px">TUITION CENTRE</span></div>' +
    inner +
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px">' +
    '<p style="color:#94A3B8;font-size:12px">D-Maths Tuition Centre · Asaba, Nigeria · dmathstuition@gmail.com</p>' +
    '</div>'
  );
}
function row_(k, v) {
  return '<tr><td style="padding:6px 14px 6px 0;color:#64748B;font-size:13px">' + k + '</td><td style="padding:6px 0;font-weight:bold">' + v + '</td></tr>';
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
