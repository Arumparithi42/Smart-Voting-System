// Result-publication emails: built ONLY from aggregate results and sent
// ONLY to voters who actually cast a vote in the election.
//
// Flow:
//   1. queueResultEmails(election)  - one ResultEmailDelivery row per voter
//      in election.voters (the existing participation record), upserted
//      with $setOnInsert so re-running it never duplicates or resets a row.
//   2. dispatchResultEmails(id)     - atomically claims each PENDING row
//      (PENDING -> SENDING) before sending, then marks it SENT or FAILED.
//      A row is only ever sent by whoever claimed it, so concurrent or
//      repeated dispatches can't double-send.
//   3. Admin retry                  - dispatchResultEmails(id, { retryFailed: true })
//      re-claims FAILED rows (and SENDING rows stuck from a crash); SENT
//      rows are never touched again.
import Election from '../models/Election.js';
import User from '../models/User.js';
import VoterIdentity from '../models/VoterIdentity.js';
import ResultEmailDelivery from '../models/ResultEmailDelivery.js';
import { buildResultSummary } from '../utils/electionResults.js';
import { sendEmail } from './emailService.js';

// A SENDING row older than this is assumed to belong to a crashed process
// and may be re-claimed by an admin retry.
const STALE_SENDING_MS = 15 * 60 * 1000;
const SEND_CONCURRENCY = 5;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatElectionDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  });
};

// Builds the email for one recipient. `summary` is buildResultSummary()
// output - aggregate counts only. The only per-recipient input is their
// display name; nothing about their own vote is (or can be) included,
// because the delivery record and the summary contain no ballot data.
export const buildResultEmail = (summary, recipientName) => {
  const name = recipientName || 'Voter';
  const subject = `Election Results Published — ${summary.electionTitle}`;
  const loginUrl = process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/result/${summary.electionId}`
    : null;

  let winnerLine;
  if (!summary.winner || !summary.winner.votes) {
    winnerLine = 'No votes were cast in this election.';
  } else if (summary.isTie) {
    winnerLine = `Tie between ${summary.winner.candidates.join(', ')} (${summary.winner.votes} votes each)`;
  } else {
    winnerLine = summary.winner.candidates[0];
  }

  const resultLines = summary.results.map(
    (r) => `${r.name}${r.partyName ? ` (${r.partyName})` : ''} — ${r.votes} ${r.votes === 1 ? 'vote' : 'votes'} — ${r.percentage.toFixed(1)}%`
  );

  const text = [
    `Hello ${name},`,
    '',
    'The results for the following election have been published:',
    '',
    'Election:',
    summary.electionTitle,
    '',
    'Election Date:',
    formatElectionDate(summary.startTime),
    '',
    'Final Results:',
    '',
    ...resultLines,
    '',
    summary.isTie ? 'Result:' : 'Winner:',
    winnerLine,
    '',
    'Thank you for participating in the election.',
    '',
    `You can view the complete results by logging into the Smart Voting System${loginUrl ? `: ${loginUrl}` : '.'}`,
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1f2937;">
      <p>Hello ${escapeHtml(name)},</p>
      <p>The results for the following election have been published:</p>
      <p><strong>Election:</strong><br/>${escapeHtml(summary.electionTitle)}</p>
      <p><strong>Election Date:</strong><br/>${escapeHtml(formatElectionDate(summary.startTime))}</p>
      <p><strong>Final Results:</strong></p>
      <table style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #d1d5db; padding:6px;">Candidate</th>
            <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Votes</th>
            <th style="text-align:right; border-bottom:1px solid #d1d5db; padding:6px;">Share</th>
          </tr>
        </thead>
        <tbody>
          ${summary.results.map((r) => `
          <tr>
            <td style="padding:6px;">${escapeHtml(r.name)}${r.partyName ? ` <span style="color:#6b7280;">(${escapeHtml(r.partyName)})</span>` : ''}</td>
            <td style="text-align:right; padding:6px;">${r.votes}</td>
            <td style="text-align:right; padding:6px;">${r.percentage.toFixed(1)}%</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <p><strong>${summary.isTie ? 'Result' : 'Winner'}:</strong><br/>${escapeHtml(winnerLine)}</p>
      <p>Thank you for participating in the election.</p>
      <p>You can view the complete results by logging into the Smart Voting System${loginUrl ? `: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a>` : '.'}</p>
    </div>`;

  return { subject, text, html };
};

// Step 1: recipients = exactly the voters recorded in election.voters (the
// same participation record that enforces one-vote-per-voter). Eligible
// voters who did not vote are never in that array, so never get a row.
export const queueResultEmails = async (election) => {
  const clerkIds = [...new Set((election.voters || []).map((v) => v.clerkId))];

  if (clerkIds.length > 0) {
    // Prefer the trusted voter-registry email (verified via the registry +
    // OTP flow); fall back to the Clerk account email for voters without a
    // registry record (e.g. an admin who voted).
    const [identities, users] = await Promise.all([
      VoterIdentity.find({ clerkId: { $in: clerkIds } }).select('clerkId email'),
      User.find({ clerkId: { $in: clerkIds } }).select('clerkId email firstName lastName'),
    ]);
    const registryEmail = new Map(identities.map((i) => [i.clerkId, i.email]));
    const userByClerkId = new Map(users.map((u) => [u.clerkId, u]));

    const ops = clerkIds.map((clerkId) => {
      const user = userByClerkId.get(clerkId);
      const email = registryEmail.get(clerkId) || user?.email || null;
      const recipientName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : 'Voter';
      const insert = email
        ? { email, recipientName, status: 'PENDING', attempts: 0 }
        : { recipientName, status: 'FAILED', attempts: 0, lastError: 'No email address on record for this voter' };
      return {
        updateOne: {
          filter: { election: election._id, clerkId },
          update: { $setOnInsert: insert },
          upsert: true,
        },
      };
    });

    try {
      await ResultEmailDelivery.bulkWrite(ops, { ordered: false });
    } catch (error) {
      // A concurrent queue for the same election can race an upsert into
      // the unique index - the row exists either way, which is all we need.
      const onlyDuplicates = error?.writeErrors?.length
        && error.writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
      if (!onlyDuplicates) throw error;
    }
  }

  await Election.updateOne(
    { _id: election._id, resultEmailsQueuedAt: { $exists: false } },
    { $set: { resultEmailsQueuedAt: new Date() } }
  );

  return clerkIds.length;
};

const claimableFilter = (electionId, retryFailed) => {
  const or = [{ status: 'PENDING' }];
  if (retryFailed) {
    or.push({ status: 'FAILED', email: { $exists: true, $ne: null } });
    or.push({ status: 'SENDING', lastAttemptAt: { $lt: new Date(Date.now() - STALE_SENDING_MS) } });
  }
  return { election: electionId, $or: or };
};

const inFlight = new Map();

// Step 2 / 3. Returns { attempted, sent, failed }.
export const dispatchResultEmails = (electionId, { retryFailed = false } = {}) => {
  const key = electionId.toString();
  const previous = inFlight.get(key) || Promise.resolve();
  // Serialize dispatches for the same election within this process (the
  // atomic claim below is what actually guarantees no double-sends, this
  // just avoids pointless contention).
  const run = previous.catch(() => {}).then(() => runDispatch(electionId, retryFailed));
  inFlight.set(key, run);
  run.finally(() => {
    if (inFlight.get(key) === run) inFlight.delete(key);
  }).catch(() => {});
  return run;
};

// Resolves once any in-progress dispatch for this election has finished.
export const waitForResultEmailDispatch = async (electionId) => {
  const run = inFlight.get(electionId.toString());
  if (run) await run.catch(() => {});
};

const runDispatch = async (electionId, retryFailed) => {
  const election = await Election.findById(electionId).populate('candidates');
  if (!election || !election.resultsPublished) {
    throw new Error('Results must be published before result emails can be sent');
  }
  const summary = buildResultSummary(election);

  const candidates = await ResultEmailDelivery.find(claimableFilter(election._id, retryFailed)).select('_id');
  const stats = { attempted: 0, sent: 0, failed: 0 };

  const processOne = async (id) => {
    const claimed = await ResultEmailDelivery.findOneAndUpdate(
      { _id: id, ...claimableFilter(election._id, retryFailed) },
      { $set: { status: 'SENDING', lastAttemptAt: new Date() }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!claimed) return; // someone else claimed / already sent

    stats.attempted += 1;
    try {
      const { subject, text, html } = buildResultEmail(summary, claimed.recipientName);
      await sendEmail({ to: claimed.email, subject, text, html });
      await ResultEmailDelivery.updateOne(
        { _id: claimed._id, status: 'SENDING' },
        { $set: { status: 'SENT', sentAt: new Date() }, $unset: { lastError: '' } }
      );
      stats.sent += 1;
    } catch (error) {
      // A failed send only affects this delivery row - the published
      // election and its results are never touched here.
      await ResultEmailDelivery.updateOne(
        { _id: claimed._id, status: 'SENDING' },
        { $set: { status: 'FAILED', lastError: String(error?.message || error).slice(0, 500) } }
      );
      stats.failed += 1;
    }
  };

  const queue = candidates.map((c) => c._id);
  const workers = Array.from({ length: Math.min(SEND_CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      await processOne(queue.shift());
    }
  });
  await Promise.all(workers);

  return stats;
};

export const getResultEmailStats = async (electionId) => {
  const rows = await ResultEmailDelivery.aggregate([
    { $match: { election: electionId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const counts = { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0 };
  for (const row of rows) counts[row._id] = row.count;
  counts.total = counts.PENDING + counts.SENDING + counts.SENT + counts.FAILED;
  return counts;
};
