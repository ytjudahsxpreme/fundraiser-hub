# Production setup — Firebase + Google Sheets

You do steps 1–7 in your browser. I'll handle the code while you click through.
At the end you'll hand me back 3 things:

- ✅ Firebase **project ID**
- ✅ The **service account JSON key file**
- ✅ The **Google Sheet URL** for each fundraiser (already shared with the service account)

Budget ~30 minutes for all of this. None of it costs money — Firebase Spark (free) plan covers everything we need.

---

## 1. Create the Firebase project (3 min)

1. Go to <https://console.firebase.google.com>
2. Click **Add project** → name it something like `fundraiser-hub-prod` → **Continue**
3. **Disable** Google Analytics (you don't need it). Continue → Create.
4. Wait for the project to provision (~30 seconds).
5. Once you land in the project dashboard, **copy the Project ID** from the URL or settings — it looks like `fundraiser-hub-prod-xxxxx`. Save it somewhere; you'll give it to me.

## 2. Enable Firestore (1 min)

1. In the left sidebar: **Build → Firestore Database**
2. Click **Create database**
3. **Production mode** (NOT test mode) → Next
4. Pick a location — `nam5 (us-central)` or your closest region → **Enable**
5. Wait ~30 seconds for it to initialize. Leave the page open.

> We'll write security rules later. For now Firestore won't accept any client connections, but our app talks to it through the Admin SDK (server-side) so no rules are required for app traffic.

## 3. Enable the Google Sheets API (1 min)

1. Open <https://console.cloud.google.com/apis/library/sheets.googleapis.com>
2. Make sure the project dropdown at the top is set to your Firebase project (same name as above).
3. Click **Enable**.

## 4. Create a service account (4 min)

The service account is the "robot user" the app uses to read your sheets.

1. Go to <https://console.cloud.google.com/iam-admin/serviceaccounts>
2. Confirm the project at the top is your Firebase project.
3. Click **Create service account**.
4. **Service account name**: `sheets-reader` → Create and continue.
5. **Grant access** step:
   - Add role: **Firebase Admin SDK Administrator Service Agent** (lets the app read/write Firestore)
   - Add another role: **Cloud Datastore User**
6. Skip the "grant users access" step → **Done**.

## 5. Download the service account key (1 min)

1. You should now see `sheets-reader` in the service accounts list. Click it.
2. Top tab: **Keys**.
3. **Add key → Create new key → JSON → Create**.
4. Your browser downloads a file like `fundraiser-hub-prod-abc123.json`.
5. **Treat this file like a password** — anyone with it can read/write your data. Don't commit it to git.

Also on this page: **copy the service account email**. It looks like
`sheets-reader@fundraiser-hub-prod-xxxxx.iam.gserviceaccount.com`.

## 6. Share each fundraiser sheet with the service account (2 min per sheet)

For every Google Sheet the app needs to read:

1. Open the sheet in Google Sheets.
2. Click **Share** (top right).
3. Paste the service account email from step 5.
4. Set permission to **Viewer**.
5. **Uncheck** "Notify people" (the service account has no inbox).
6. Click **Share**.
7. Copy the full sheet URL (it looks like `https://docs.google.com/spreadsheets/d/LONG_ID_HERE/edit#gid=0`).

Repeat for each fundraiser. Keep a list of which sheet belongs to which fundraiser (Pizza / Empanadas / Subway / Ice Cream / etc.).

## 7. Drop the key file in the project (30 sec)

1. Rename the downloaded JSON to `service-account.json`.
2. Move it to `C:\dev\fundraiser-app\` (the project root).
3. **Verify** `.gitignore` ignores it — already configured to ignore anything under `*.json` named `service-account*`, but double-check before any `git add`.

---

## What to hand back to me

When you're done, paste me:

```
Project ID: fundraiser-hub-prod-xxxxx
Service account JSON: (saved at C:\dev\fundraiser-app\service-account.json) ✅
Sheets:
  - juniors-pizza:        https://docs.google.com/spreadsheets/d/.../edit
  - seniors-empanadas:    https://docs.google.com/spreadsheets/d/.../edit
  - sophomores-subway:    https://docs.google.com/spreadsheets/d/.../edit
  - freshmen-icecream:    https://docs.google.com/spreadsheets/d/.../edit
```

I'll wire it up, run the seed script, and we'll do a local test before deploying.

---

## After this comes (my work)

1. Run `npm run seed` — uploads your current fundraiser configs to Firestore.
2. Local test against the real sheets.
3. Push to GitHub.
4. Deploy to Vercel, paste the same env vars there.
5. You get a live URL like `https://fundraiser-hub.vercel.app`.

## Common pitfalls

- **"403: Caller does not have permission"** when reading a sheet → you forgot to share that sheet with the service account email, OR the sheet ID is wrong.
- **"Could not load default credentials"** locally → the JSON key isn't at the path the app expects, or the env var isn't set. We'll set up `.env.local` for that.
- **Firestore connection refused** → Firestore wasn't created in step 2, or the wrong project ID is in the env var.
- **Vercel build fails on missing env vars** → set `FIREBASE_SERVICE_ACCOUNT_JSON` and `FIREBASE_PROJECT_ID` in the Vercel project settings.
