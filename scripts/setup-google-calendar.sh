#!/bin/sh
# Provisions the Google Cloud side of the booking calendar integration.
#
#   sh scripts/setup-google-calendar.sh [--project ID] [--sa NAME]
#
# Creates (or reuses) a project, enables ONLY the Calendar API, creates a
# service account with NO IAM roles — calendar access comes from per-calendar
# sharing, not from project IAM — and mints a JSON key.
#
# Every step is idempotent: re-running will not create a second project, a
# second account, or a second key.
#
# It deliberately does NOT create the calendars. They are owned by the human,
# in their own Google Calendar, so that losing the service account cannot take
# the booking history with it. See scripts/setup-google-calendar.md.

set -e

PROJECT_ID="kiddo-studio-booking"
SA_NAME="kiddo-booking-bot"
OUT_DIR="scripts/.sync"

while [ $# -gt 0 ]; do
  case "$1" in
    --project) PROJECT_ID="$2"; shift 2 ;;
    --sa)      SA_NAME="$2";    shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 1 ;;
  esac
done

# The winget install does not put gcloud on PATH for an already-open shell.
if ! command -v gcloud >/dev/null 2>&1; then
  for c in \
    "$LOCALAPPDATA/Google/Cloud SDK/google-cloud-sdk/bin" \
    "/c/Users/$USER/AppData/Local/Google/Cloud SDK/google-cloud-sdk/bin" \
    "/c/Program Files/Google/Cloud SDK/google-cloud-sdk/bin"
  do
    [ -x "$c/gcloud" ] || [ -x "$c/gcloud.cmd" ] && PATH="$PATH:$c" && break
  done
fi
command -v gcloud >/dev/null 2>&1 || {
  echo "HALT: gcloud not found. Install it, then re-run." >&2
  exit 1
}

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
[ -n "$ACCOUNT" ] || {
  echo "HALT: not authenticated. Run: gcloud auth login" >&2
  exit 1
}
echo "Authenticated as $ACCOUNT"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_PATH="${OUT_DIR}/${SA_NAME}-key.json"

# 1. Project ------------------------------------------------------------------
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Project $PROJECT_ID already exists — reusing."
else
  echo "Creating project $PROJECT_ID…"
  gcloud projects create "$PROJECT_ID" --name="Kiddo Studio Booking"
fi
gcloud config set project "$PROJECT_ID" >/dev/null

# A project with no billing account can still use the Calendar API, but
# project creation itself can be blocked by org policy — say so plainly.
if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  echo "HALT: cannot access project $PROJECT_ID." >&2
  exit 1
fi

# 2. API ----------------------------------------------------------------------
if gcloud services list --enabled --filter="config.name:calendar-json.googleapis.com" \
     --format="value(config.name)" 2>/dev/null | grep -q calendar; then
  echo "Calendar API already enabled."
else
  echo "Enabling the Google Calendar API…"
  gcloud services enable calendar-json.googleapis.com
fi

# 3. Service account ----------------------------------------------------------
if gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  echo "Service account already exists — reusing."
else
  echo "Creating service account $SA_NAME…"
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Kiddo booking bot" \
    --description="Writes tentative booking events to the studio room calendars"
fi
# NOTE: no `gcloud projects add-iam-policy-binding` anywhere in this script.
# Calendar access is granted per calendar, by a human, in the Calendar UI.

# 4. Key ----------------------------------------------------------------------
mkdir -p "$OUT_DIR"
if [ -f "$KEY_PATH" ]; then
  echo "Key already present at $KEY_PATH — not minting another."
else
  echo "Creating key…"
  gcloud iam service-accounts keys create "$KEY_PATH" --iam-account="$SA_EMAIL"
fi

# 5. Env block ----------------------------------------------------------------
PRIV_B64=$(node -e "
  const k = require('./${KEY_PATH}');
  if (!k.private_key || !k.private_key.startsWith('-----BEGIN PRIVATE KEY-----')) {
    console.error('key file has no usable private_key'); process.exit(1);
  }
  process.stdout.write(Buffer.from(k.private_key, 'utf8').toString('base64'));
")

ENV_OUT="${OUT_DIR}/gcal.env"
cat > "$ENV_OUT" <<EOF
GOOGLE_SA_CLIENT_EMAIL=${SA_EMAIL}
GOOGLE_SA_PRIVATE_KEY_B64=${PRIV_B64}
GCAL_TIMEZONE=Europe/Lisbon
BOOKING_CALENDAR_WRITE=on
# Fill these in after creating and sharing the two calendars — see
# scripts/setup-google-calendar.md step 2.
GCAL_CAL_ROOM_CYC=
GCAL_CAL_ROOM_BLK=
EOF

cat <<EOF

──────────────────────────────────────────────────────────────────────────────
Cloud side done.

  project          ${PROJECT_ID}
  service account  ${SA_EMAIL}
  key              ${KEY_PATH}      (gitignored — it is a credential)
  env draft        ${ENV_OUT}

YOUR TURN — the one part that cannot be scripted, because a service account
cannot grant itself access to your calendars:

  1. Google Calendar -> Create new calendar -> "Kiddo — Cyclorama",
     time zone (GMT+00:00) Lisbon.
  2. Same for "Kiddo — Black Box".
  3. For each: Settings -> Share with specific people -> add
        ${SA_EMAIL}
     with permission "Make changes to events".
Keep the words "Cyclorama" and "Black Box" in the names — that is how they get
matched. You do NOT need to copy any Calendar IDs; run this and it finds them:

  npm run gcal:discover
  npm run gcal:smoke
──────────────────────────────────────────────────────────────────────────────
EOF
