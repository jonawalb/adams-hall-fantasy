// Send Supabase invite emails to every league member in data/members.json.
// Run locally by the commissioner — the service-role key must NEVER be
// committed or shipped to the browser.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key from Project Settings > API> \
//   SITE_URL=https://<user>.github.io/<repo> \
//   node scripts/invite-members.mjs
//
// Each invited member gets an email whose link lands on ${SITE_URL}/welcome/
// where they set their display name + password. Safe to re-run: members who
// already have an account are skipped.
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

if (!url || !serviceKey || !siteUrl) {
  console.error(
    "Missing env vars. Required:\n" +
      "  SUPABASE_URL                — Project Settings > API > Project URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY   — Project Settings > API > service_role (keep secret!)\n" +
      "  SITE_URL                    — deployed site root, e.g. https://user.github.io/adams-hall-fantasy",
  );
  process.exit(1);
}

const roster = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "data", "members.json"), "utf8"),
);
const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let sent = 0;
for (const m of roster) {
  if (!m.email) {
    console.log(`SKIP  ${m.display_name} — no email in data/members.json`);
    continue;
  }
  const { error } = await supabase.auth.admin.inviteUserByEmail(m.email, {
    redirectTo: `${siteUrl}/welcome/`,
    data: {
      display_name: m.display_name,
      espn_owner_id: m.espn_owner_id,
      is_commissioner: m.is_commissioner === true,
    },
  });
  if (error) {
    if (/already/i.test(error.message)) {
      console.log(`OK    ${m.display_name} — already has an account, skipped`);
    } else {
      console.error(`FAIL  ${m.display_name} <${m.email}> — ${error.message}`);
    }
  } else {
    console.log(`SENT  ${m.display_name} <${m.email}>`);
    sent++;
  }
}
console.log(`\nDone: ${sent} invitation(s) sent.`);
