#!/bin/bash
# Add the admin console domain to the Supabase auth redirect allow-list and
# raise the auth email rate limits. Verifies what was actually saved.
#
# Run locally: bash scripts/configure-auth-redirects.sh
set -euo pipefail

PROJECT_REF="oztfzqkpwwfnxrydmsuo"
ADMIN_URL="https://client.loopcmbntr.live/**"

TOKEN="${SUPABASE_ACCESS_TOKEN:-$(security find-generic-password -s "Supabase CLI" -a supabase -w)}"
# The Supabase CLI stores the token via go-keyring, which base64-wraps it
if [[ "$TOKEN" == go-keyring-base64:* ]]; then
  TOKEN=$(printf '%s' "${TOKEN#go-keyring-base64:}" | base64 -d)
fi

echo "Validating token ..."
curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" > /tmp/sb-auth-current.json
ERR=$(python3 -c "import json;print(json.load(open('/tmp/sb-auth-current.json')).get('message') or '')")
if [ -n "$ERR" ]; then
  echo "Token rejected by Supabase API: $ERR" >&2
  echo "Fix: run 'supabase login' (or set SUPABASE_ACCESS_TOKEN) and re-run this script." >&2
  exit 1
fi

CURRENT=$(python3 -c "import json;print(json.load(open('/tmp/sb-auth-current.json')).get('uri_allow_list') or '')")
echo "Current allow-list: ${CURRENT:-<empty>}"

if [[ ",$CURRENT," == *",$ADMIN_URL,"* ]]; then
  NEW="$CURRENT"
  echo "Admin URL already present."
elif [ -z "$CURRENT" ]; then
  NEW="$ADMIN_URL"
else
  NEW="$CURRENT,$ADMIN_URL"
fi

PAYLOAD=$(NEW="$NEW" python3 -c "
import json, os
print(json.dumps({'uri_allow_list': os.environ['NEW']}))
")

echo "Applying ..."
HTTP=$(curl -s -o /tmp/sb-auth-result.json -w "%{http_code}" \
  -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

if [ "$HTTP" != "200" ]; then
  echo "PATCH failed with HTTP $HTTP:" >&2
  cat /tmp/sb-auth-result.json >&2
  exit 1
fi

python3 - <<'PYEOF'
import json
d = json.load(open("/tmp/sb-auth-result.json"))
print("Saved config:")
print("  uri_allow_list: ", d.get("uri_allow_list"))
PYEOF
rm -f /tmp/sb-auth-current.json /tmp/sb-auth-result.json
echo "Done."
