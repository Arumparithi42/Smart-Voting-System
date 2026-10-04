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

## ⚙️ Configuration

See `backend/.env.example`. Email delivery is configured with `EMAIL_PROVIDER`:

* `console` (default): emails are printed to the server console and nothing is sent. Use this for local development and demos.
* `smtp`: real delivery via `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM` (works with Gmail app passwords, SendGrid, Mailgun, SES, Brevo, …).

## 🧪 Tests

The backend integration tests run against a real MongoDB instance (Clerk is stubbed):

```bash
cd backend
MONGO_TEST_URI=mongodb://127.0.0.1:27017/svs_test npm test
```

The test database is dropped before and after the run.
