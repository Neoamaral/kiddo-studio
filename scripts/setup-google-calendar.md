# Google Calendar setup

The booking flow blocks slots by writing tentative events into one Google
Calendar per physical room. This is what has to exist for that to work.

**Ownership decision, already made:** the two calendars are created and owned by
**you**, in your own Google Calendar, and shared with the service account. A
calendar created by a service account belongs to that service account — delete
the account or lose the key and the calendar takes every booking with it.

---

## 1. Cloud project and service account (scripted)

`scripts/setup-google-calendar.sh` does this part. It needs `gcloud` and one
`gcloud auth login`.

```sh
sh scripts/setup-google-calendar.sh                    # uses/creates kiddo-studio-booking
sh scripts/setup-google-calendar.sh --project my-proj  # or an existing project
```

It will:

1. select or create the project;
2. enable **only** the Google Calendar API (`calendar-json.googleapis.com`);
3. create the service account `kiddo-booking-bot` with **no IAM roles** —
   calendar access comes from per-calendar sharing, not from IAM, and granting
   project roles here would be strictly worse than granting nothing;
4. mint a JSON key into `scripts/.sync/` (gitignored — it is a credential);
5. print the service account email and the ready-to-paste env block.

Re-running is safe: every step checks for existing state first. It will not
mint a second key if one is already on disk.

## 2. The two calendars (manual, ~2 minutes)

In Google Calendar, as the Workspace owner:

1. **Other calendars → + → Create new calendar.** Name it `Kiddo — Cyclorama`.
   Set **Time zone: (GMT+00:00) Lisbon**. Create.
2. Same again for `Kiddo — Black Box`.
3. For each: **Settings → Share with specific people or groups → Add people →**
   paste the service account email the script printed →
   permission **"Make changes to events"**.
   Not "See all event details" — the site has to write, not just read.

That is the whole manual part. **You do not need to copy the Calendar IDs** —
once a calendar is shared it shows up in the service account's own calendar
list, so:

```sh
npm run gcal:discover
```

finds both by name, warns if either is not on Europe/Lisbon, and writes the ids
into `scripts/.sync/gcal.env` itself. It matches `/cyclo/i` and
`/black ?box/i`, so keep those words in the calendar names.

**Why the sharing step cannot be scripted:** the service account has no access
to your calendars until you grant it, and it cannot grant itself access. That
is the security boundary working as intended, not a gap in the tooling.

## 3. Environment variables

Local: put them in `.env.local` (gitignored).
Production: Vercel → Project → Settings → Environment Variables.

```
GOOGLE_SA_CLIENT_EMAIL=kiddo-booking-bot@<project>.iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY_B64=<base64 of the PEM, single line>
GCAL_CAL_ROOM_CYC=<...>@group.calendar.google.com
GCAL_CAL_ROOM_BLK=<...>@group.calendar.google.com
GCAL_TIMEZONE=Europe/Lisbon
BOOKING_CALENDAR_WRITE=on
```

### The private key newline trap

The JSON key stores the PEM with the two literal characters `\` and `n`. Paste
that into Vercel's env UI and the decoder fails with
`error:1E08010C:DECODER routines::unsupported`, which tells you nothing about
the real cause.

Use `GOOGLE_SA_PRIVATE_KEY_B64` — base64 is a single line, so it survives every
env UI, every `vercel env pull` and every copy-paste. The setup script emits it
already encoded. The code refuses to start on a key that does not decode to
something beginning `-----BEGIN PRIVATE KEY-----`.

## 4. Verify before wiring anything up

```sh
npm run gcal:smoke
```

It mints a token, calls `calendars.get` on both ids and prints their names
(this is the check that catches "you forgot to share it" — by far the most
common setup failure), runs a `freebusy.query`, inserts a **tentative** event
six months out, re-queries freebusy to **prove a tentative event really does
read as busy**, then deletes it.

Do not skip the tentative-shows-as-busy assertion. The whole design assumes
it — a tentative event blocking the slot while you confirm manually — and it is
cheaper to prove than to debug in production.

## 5. Kill switch

`BOOKING_CALENDAR_WRITE=off` degrades the site to email-only with no redeploy.
Missing credentials do the same thing automatically, which is why the phase 2
code can ship before any of this exists.
