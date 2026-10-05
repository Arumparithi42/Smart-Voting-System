# 🗳️ Online Voting Management System

A secure and easy-to-use online voting platform where users can cast votes, track elections, and view results. Admins can create and manage voting events with automated handling of active and ended votes.

---

## 🚀 Features

### 👤 User Features
- 🗳️ Cast votes for available candidates in active elections.
- 📅 View upcoming, ongoing, and ended voting events.
- 📊 Check results of completed votes.

### 🛠️ Admin Features
- ➕ Create new voting events and add candidate options.
- ⏱️ Automatically or manually end a voting event after a set time.
- 📂 View all elections and their statuses (upcoming, ongoing, ended).
- 📊 View live vote counts.

---

## 👥 Roles

| Role | Can | Cannot |
|------|-----|--------|
| **Voter / User** | View elections, vote (after voter registry + OTP verification), view **published** results, receive the result email if they voted, raise complaints and track their own complaints | Create/approve elections, publish results, change vote counts, see other users' complaints, access officer/admin dashboards |
| **Election Officer** | Propose elections to the Admin, revise proposals the Admin sends back, monitor approved elections (status + turnout), review final aggregate results after voting closes, recommend publication | Create official elections or bypass Admin approval, publish results, see live per-candidate tallies, modify votes, access voter registry data (Aadhaar), receive voter complaints |
| **Admin** | Everything above plus: approve / reject / request revision of proposals, create & schedule elections, publish official results, retry failed result emails, handle complaints, appoint Election Officers | — (final authority) |

All permissions are enforced by the backend from the role stored in MongoDB. The frontend's role display is UX only.

Election Officers are appointed by an Admin from **Dashboard → Officers & Users**. Admin accounts are only created directly in the database (set `role: "admin"` on the user document).

## 🔄 Election workflow

```
Election Officer ──proposal──▶ Admin reviews ──approve──▶ official Election
                                   │                        DRAFT → UPCOMING → ONGOING → ENDED → RESULTS_PUBLISHED
                                   ├─ reject                                              │
                                   └─ request revision ──▶ officer revises & resubmits   │
                                                                                          ▼
                     Officer reviews final results & recommends ──▶ Admin publishes ──▶ website results
                                                                                     └─▶ result email to voters who voted
Voter ──complaint──▶ Admin (respond / resolve / reject)
```

* **Results** are calculated from the aggregate candidate counters once voting closes, and only become public after an Admin publishes them.
* **Result emails** go only to voters in the election's participation record (`Election.voters`), never to eligible non-voters. They contain only aggregate results. Each voter has one `ResultEmailDelivery` row per election (unique index), so re-publishing or retrying never sends duplicates. Failed deliveries are recorded and an Admin can retry them.
* **Complaints** get a reference ID like `CMP-2026-00124` and are visible only to their author and to Admins.

## ✨ Features

| Feature | Where | Notes |
|---|---|---|
| **Smart Voting Assistant (chatbot)** | Floating "Need help?" button on every signed-in page | Read-only. Answers only from public election data and the user's own account. Refuses requests for Aadhaar, OTPs, passwords, keys, other users' data or vote choices, and any action (voting, publishing, role changes). Rule-based by default; optional Claude provider. |
| **Election countdown** | Election cards, details, vote and dashboard pages | "Election starts in / ends in DD:HH:MM:SS", then "Election Ended" / "Results Published". Uses the stored UTC times and the server clock (`X-Server-Time`), so it survives refreshes and wrong device clocks. Display only; the backend validates every vote. |
| **Reminder notifications** | Bell icon (top bar / header), Dashboard → Notifications | Server-side scheduler: starts within 24 h, starts within 1 h, voting open, closing within 1 h (only voters who haven't voted), voting closed. Also results published and complaint updates. Never duplicated (unique per user + reminder). Includes mark read and mark all read. |
| **Result publication + email** | Admin → Manage Elections → Review & Publish | Only voters who actually voted are emailed, with aggregate results only. Duplicate-proof, with failed-delivery retry. Ties are reported as "Result: Tie". |
| **Election Officer** | Officer dashboard | Proposes elections, monitors approved ones (status, turnout, hourly participation), manages candidates only before voting starts, reviews final results and recommends publication. Cannot create elections, publish results or see votes. |
| **Profile** | Dashboard → Profile | Display name, bio and photo URL are editable. Voter ID, registered email and masked phone are read-only. Aadhaar, OTPs and passwords are never returned. |
| **Complaints** | Dashboard → My Complaints / Admin → Complaints | Go directly to the Admin with a reference ID (e.g. `CMP-2026-00124`). Visible only to the author and Admins. |

## ⚙️ Configuration

See `backend/.env.example`. Email delivery is configured with `EMAIL_PROVIDER`:

* `console` (default): emails are printed to the server console and nothing is sent. Use this for local development and demos.
* `smtp`: real delivery via `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` (works with Gmail app passwords, SendGrid, Mailgun, SES, Brevo, …).

Check your email setup with `cd backend && npm run test-email -- you@example.com`. The backend also prints `Email: SMTP ready` or `Email: SMTP login FAILED (...)` when it starts.

Election reminders: `NOTIFICATION_INTERVAL_MS` (default `60000`; `0` disables the scheduler).

Chatbot: `CHATBOT_PROVIDER=rules` (default, no external service) or `anthropic` with `ANTHROPIC_API_KEY` (server-side only; optional `CHATBOT_MODEL`). Per-user rate limit: `CHATBOT_RATE_LIMIT_PER_MIN` (default 20).

## ▶️ Running locally

```bash
# backend
cd backend
npm install
cp .env.example .env      # then fill in MONGO_URI and the Clerk keys
npm run dev               # http://localhost:5000

# frontend (second terminal)
cd frontend
npm install
cp .env.example .env      # VITE_BACKEND_URL and VITE_CLERK_PUBLISHABLE_KEY
npm run dev               # http://localhost:5173
```

## 🧪 Tests

The backend integration tests run against a real MongoDB instance (Clerk is stubbed):

```bash
cd backend
MONGO_TEST_URI=mongodb://127.0.0.1:27017/svs_test npm test
# Windows PowerShell:  $env:MONGO_TEST_URI="mongodb://127.0.0.1:27017/svs_test"; npm test
```

The test database is dropped before and after the run.
