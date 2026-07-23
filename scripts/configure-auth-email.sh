#!/bin/bash
# Configure Supabase auth emails to send from Loop_cmbntr via Resend SMTP,
# with a branded magic-link template and raised email rate limits.
# Covers console + admin (shared Supabase project).
#
# Run locally: bash scripts/configure-auth-email.sh
# Requires: supabase CLI logged in (token in keychain), Resend key with
# loopcmbntr.live verified (read from loop-canada/.env.local or $RESEND_API_KEY).
set -euo pipefail

PROJECT_REF="oztfzqkpwwfnxrydmsuo"
SENDER_EMAIL="noreply@loopcmbntr.live"
SENDER_NAME="Loop_cmbntr"

TOKEN="${SUPABASE_ACCESS_TOKEN:-$(security find-generic-password -s "Supabase CLI" -a supabase -w)}"
# The Supabase CLI stores the token via go-keyring, which base64-wraps it
if [[ "$TOKEN" == go-keyring-base64:* ]]; then
  TOKEN=$(printf '%s' "${TOKEN#go-keyring-base64:}" | base64 -d)
fi

echo "Validating token ..."
curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" > /tmp/sb-auth-check.json
ERR=$(python3 -c "import json;print(json.load(open('/tmp/sb-auth-check.json')).get('message') or '')")
rm -f /tmp/sb-auth-check.json
if [ -n "$ERR" ]; then
  echo "Token rejected by Supabase API: $ERR" >&2
  echo "Fix: run 'supabase login' (or set SUPABASE_ACCESS_TOKEN) and re-run this script." >&2
  exit 1
fi

RESEND_KEY="${RESEND_API_KEY:-}"
if [ -z "$RESEND_KEY" ]; then
  RESEND_KEY=$(grep -oh "re_[A-Za-z0-9_]*" \
    "$HOME/Documents/Coding Loop Enrolment/loop-canada/.env.local" | head -1)
fi
if [ -z "$RESEND_KEY" ]; then
  echo "No Resend API key found. Set RESEND_API_KEY and re-run." >&2
  exit 1
fi

# Build the payload with a top-level heredoc into a file: heredocs inside
# command substitution break on macOS bash 3.2.
export RESEND_KEY SENDER_EMAIL SENDER_NAME
python3 > /tmp/sb-auth-payload.json <<'PYEOF'
import json, os

template = """<div style="background-color:#0a0a0a;padding:48px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:40px;">
    <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#f59e0b;letter-spacing:-0.02em;">Loop_cmbntr</p>
    <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#fafafa;">Your sign-in link</h1>
    <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a3a3a3;">Click the button below to sign in to your Loop_cmbntr account. This link expires in one hour and can only be used once.</p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background-color:#f59e0b;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">Sign in</a>
    <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#737373;">If you did not request this email, you can safely ignore it. Someone may have typed your address by mistake.</p>
  </div>
  <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:12px;color:#525252;">Loop_cmbntr, collective governance for communities</p>
</div>"""

print(json.dumps({
    "smtp_host": "smtp.resend.com",
    "smtp_port": "465",
    "smtp_user": "resend",
    "smtp_pass": os.environ["RESEND_KEY"],
    "smtp_admin_email": os.environ["SENDER_EMAIL"],
    "smtp_sender_name": os.environ["SENDER_NAME"],
    "mailer_subjects_magic_link": "Sign in to Loop_cmbntr",
    "mailer_templates_magic_link_content": template,
    "rate_limit_email_sent": 360,
    "smtp_max_frequency": 10,
}))
PYEOF

echo "Applying auth email config to project $PROJECT_REF ..."
HTTP=$(curl -s -o /tmp/sb-auth-config-result.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @/tmp/sb-auth-payload.json)
rm -f /tmp/sb-auth-payload.json

if [ "$HTTP" != "200" ]; then
  echo "PATCH failed with HTTP $HTTP:" >&2
  cat /tmp/sb-auth-config-result.json >&2
  exit 1
fi

python3 <<'PYEOF'
import json
d = json.load(open("/tmp/sb-auth-config-result.json"))
print("smtp_host:             ", d.get("smtp_host"))
print("smtp_sender_name:      ", d.get("smtp_sender_name"))
print("smtp_admin_email:      ", d.get("smtp_admin_email"))
print("magic link subject:    ", d.get("mailer_subjects_magic_link"))
print("template set:          ", bool(d.get("mailer_templates_magic_link_content")))
print("rate_limit_email_sent: ", d.get("rate_limit_email_sent"))
print("smtp_max_frequency:    ", d.get("smtp_max_frequency"))
PYEOF
rm -f /tmp/sb-auth-config-result.json

echo "Done. Auth emails now send as $SENDER_NAME <$SENDER_EMAIL>."
