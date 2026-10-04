// End-to-end tests for the officer -> admin proposal workflow, result
// publication + result emails, and the complaint system. Runs the real
// Express app against a real MongoDB; only Clerk's session verification is
// stubbed (the caller's clerkId comes from an x-test-user header instead
// of a signed session token). Everything else - role checks, voting,
// publication, email queueing - is the production code path.
//
// Run: MONGO_TEST_URI=mongodb://127.0.0.1:27017/svs_test npm test
import { test, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';

const MONGO_TEST_URI = process.env.MONGO_TEST_URI;

mock.module('@clerk/express', {
  namedExports: {
    clerkMiddleware: () => (req, res, next) => next(),
    getAuth: (req) => ({ userId: req.headers['x-test-user'] || null }),
  },
});

let server;
let baseUrl;
let mongoose;
let models;
let emailService;
let resultEmailService;
const sentEmails = [];

const api = async (method, path, { as, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (as) headers['x-test-user'] = as;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
};

const ADMIN = 'admin_1';
const ADMIN_NONVOTER = 'admin_2';
const OFFICER = 'officer_1';
const VOTERS = ['voter_1', 'voter_2', 'voter_3', 'voter_4']; // voter_4 never votes
const voterEmail = (clerkId) => `${clerkId}@college.test`;

const hour = 60 * 60 * 1000;
const proposalBody = (overrides = {}) => ({
  title: 'MIT Student Council Election 2026',
  description: 'Election for selecting student representatives for the academic year 2026-27.',
  purpose: 'Student representation',
  category: 'Student Council',
  proposedStartTime: new Date(Date.now() + 24 * hour).toISOString(),
  proposedEndTime: new Date(Date.now() + 30 * hour).toISOString(),
  officerNotes: 'Recommended to conduct the election during college working hours.',
  candidates: [
    { name: 'Candidate A', partyName: 'Party A' },
    { name: 'Candidate B', partyName: 'Party B' },
    { name: 'Candidate C', partyName: 'Party C' },
  ],
  ...overrides,
});

before(async () => {
  if (!MONGO_TEST_URI) return;
  process.env.EMAIL_PROVIDER = 'console';

  mongoose = (await import('mongoose')).default;
  await mongoose.connect(MONGO_TEST_URI);
  await mongoose.connection.dropDatabase();

  const { default: app } = await import('../app.js');
  models = {
    User: (await import('../models/User.js')).default,
    VoterIdentity: (await import('../models/VoterIdentity.js')).default,
    Election: (await import('../models/Election.js')).default,
    Candidate: (await import('../models/Candidate.js')).default,
    ElectionProposal: (await import('../models/ElectionProposal.js')).default,
    ResultEmailDelivery: (await import('../models/ResultEmailDelivery.js')).default,
    Complaint: (await import('../models/Complaint.js')).default,
  };
  await Promise.all(Object.values(models).map((m) => m.syncIndexes()));

  emailService = await import('../services/emailService.js');
  resultEmailService = await import('../services/resultEmailService.js');
  emailService.setEmailSenderOverride(async (mail) => {
    sentEmails.push(mail);
    return { delivered: true };
  });

  await models.User.create([
    { clerkId: ADMIN, email: 'admin@college.test', firstName: 'Ada', role: 'admin' },
    { clerkId: ADMIN_NONVOTER, email: 'admin2@college.test', firstName: 'Second', role: 'admin' },
    { clerkId: OFFICER, email: 'officer@college.test', firstName: 'Olive', role: 'officer' },
    ...VOTERS.map((clerkId, i) => ({ clerkId, email: `clerk_${clerkId}@mail.test`, firstName: `Voter${i + 1}`, role: 'user' })),
  ]);
  // Registry records with completed OTP verification (the real flow is
  // covered by voterController; here we only need eligible voters).
  await models.VoterIdentity.create(VOTERS.map((clerkId, i) => ({
    voterId: `MIT00${i + 1}`,
    email: voterEmail(clerkId),
    phoneNumber: `900000000${i + 1}`,
    aadhaarHash: `hash-${clerkId}`,
    clerkId,
    otpVerified: true,
  })));

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!MONGO_TEST_URI) return;
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const skip = !MONGO_TEST_URI && 'MONGO_TEST_URI not set';

// Shared state across the ordered tests below.
const state = {};

test('proposal: officer submits, admin receives; officer/voter cannot create elections', { skip }, async () => {
  // 1. Officer creates proposal
  const created = await api('POST', '/api/officer/proposals', { as: OFFICER, body: { ...proposalBody(), status: 'APPROVED' } });
  assert.equal(created.status, 201);
  assert.equal(created.data.message, 'Election proposal submitted to Admin.');
  assert.equal(created.data.proposal.status, 'PENDING', 'client-supplied status must be ignored');
  state.proposalId = created.data.proposal._id;

  // 2. Admin receives it, with the proposing officer
  const list = await api('GET', '/api/admin/proposals?status=PENDING', { as: ADMIN });
  assert.equal(list.status, 200);
  const received = list.data.find((p) => p._id === state.proposalId);
  assert.ok(received);
  assert.equal(received.proposedBy.email, 'officer@college.test');
  assert.equal(received.officerNotes, 'Recommended to conduct the election during college working hours.');
  assert.equal(received.candidates.length, 3);

  // 6 / 28. Officer cannot create an official election or approve
  assert.equal((await api('POST', '/api/admin/elections', { as: OFFICER, body: { title: 'x', startTime: new Date(), endTime: new Date(Date.now() + hour) } })).status, 403);
  assert.equal((await api('POST', `/api/admin/proposals/${state.proposalId}/approve`, { as: OFFICER })).status, 403);
  assert.equal((await api('GET', '/api/admin/proposals', { as: OFFICER })).status, 403);

  // 26. Voter cannot create elections or proposals
  assert.equal((await api('POST', '/api/admin/elections', { as: 'voter_1', body: { title: 'x' } })).status, 403);
  assert.equal((await api('POST', '/api/officer/proposals', { as: 'voter_1', body: proposalBody() })).status, 403);

  // 31. Unauthenticated
  assert.equal((await api('POST', '/api/officer/proposals', { body: proposalBody() })).status, 401);
  assert.equal((await api('GET', '/api/admin/proposals')).status, 401);

  // No election exists yet - a proposal is not an election
  assert.equal(await models.Election.countDocuments(), 0);
});

test('proposal: admin can reject and request revision; officer can revise and resubmit', { skip }, async () => {
  const p2 = await api('POST', '/api/officer/proposals', { as: OFFICER, body: proposalBody({ title: 'Rejected Election' }) });
  const noReason = await api('POST', `/api/admin/proposals/${p2.data.proposal._id}/reject`, { as: ADMIN, body: {} });
  assert.equal(noReason.status, 400);
  const rejected = await api('POST', `/api/admin/proposals/${p2.data.proposal._id}/reject`, { as: ADMIN, body: { reason: 'Duplicate of another election' } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.data.proposal.status, 'REJECTED');
  // Rejected is final
  assert.equal((await api('POST', `/api/admin/proposals/${p2.data.proposal._id}/approve`, { as: ADMIN })).status, 409);
  assert.equal((await api('PUT', `/api/officer/proposals/${p2.data.proposal._id}`, { as: OFFICER, body: { title: 'again' } })).status, 409);

  const p3 = await api('POST', '/api/officer/proposals', { as: OFFICER, body: proposalBody({ title: 'Needs Revision' }) });
  const rev = await api('POST', `/api/admin/proposals/${p3.data.proposal._id}/request-revision`, { as: ADMIN, body: { feedback: 'Please move it to a weekday.' } });
  assert.equal(rev.status, 200);
  assert.equal(rev.data.proposal.status, 'REVISION_REQUESTED');
  // Can't approve while awaiting revision
  assert.equal((await api('POST', `/api/admin/proposals/${p3.data.proposal._id}/approve`, { as: ADMIN })).status, 409);

  const mine = await api('GET', '/api/officer/proposals', { as: OFFICER });
  assert.equal(mine.data.find((p) => p._id === p3.data.proposal._id).adminFeedback, 'Please move it to a weekday.');

  const resubmitted = await api('PUT', `/api/officer/proposals/${p3.data.proposal._id}`, { as: OFFICER, body: { title: 'Needs Revision (weekday)', status: 'APPROVED' } });
  assert.equal(resubmitted.status, 200);
  assert.equal(resubmitted.data.proposal.status, 'PENDING');
  assert.equal(resubmitted.data.proposal.revisionCount, 1);
  state.revisedProposalId = p3.data.proposal._id;
});

test('proposal: approval creates exactly one official election (admin can adjust details)', { skip }, async () => {
  // Admin adjusts dates so the election is open right now (for the voting
  // tests below) and tries to smuggle vote counts in - must be ignored.
  const approved = await api('POST', `/api/admin/proposals/${state.proposalId}/approve`, {
    as: ADMIN,
    body: {
      startTime: new Date(Date.now() - 60_000).toISOString(),
      endTime: new Date(Date.now() + hour).toISOString(),
      candidates: [
        { name: 'Candidate A', partyName: 'Party A', votes: 999 },
        { name: 'Candidate B', partyName: 'Party B', votes: 999 },
        { name: 'Candidate C', partyName: 'Party C' },
      ],
      status: 'completed',
      resultsPublished: true,
    },
  });
  assert.equal(approved.status, 201);
  const election = approved.data.election;
  state.electionId = election._id;
  assert.equal(election.status, 'upcoming');
  assert.equal(election.resultsPublished, false);
  assert.equal(election.proposalId, state.proposalId);
  assert.equal(approved.data.proposal.status, 'APPROVED');
  assert.equal(approved.data.proposal.createdElection, election._id);

  const candidates = await models.Candidate.find({ _id: { $in: election.candidates } });
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((c) => c.votes === 0), 'client cannot set vote counts');
  state.candidates = Object.fromEntries(candidates.map((c) => [c.name, c._id.toString()]));

  // Approving twice never creates a second election
  assert.equal((await api('POST', `/api/admin/proposals/${state.proposalId}/approve`, { as: ADMIN })).status, 409);
  assert.equal(await models.Election.countDocuments({ proposalId: state.proposalId }), 1);
});

test('lifecycle: draft elections are hidden and not votable until scheduled', { skip }, async () => {
  const draft = await api('POST', `/api/admin/proposals/${state.revisedProposalId}/approve`, {
    as: ADMIN,
    body: { createAsDraft: true, startTime: new Date(Date.now() - 60_000).toISOString() },
  });
  assert.equal(draft.status, 201);
  const draftId = draft.data.election._id;
  assert.equal(draft.data.election.status, 'draft');

  const publicList = await api('GET', '/api/elections');
  assert.ok(!publicList.data.some((e) => e._id === draftId), 'draft hidden from public');
  assert.equal((await api('GET', `/api/elections/${draftId}`, { as: 'voter_1' })).status, 404);
  const staffList = await api('GET', '/api/elections', { as: OFFICER });
  assert.equal(staffList.data.find((e) => e._id === draftId).lifecycleStage, 'DRAFT');

  const candidateId = draft.data.election.candidates[0];
  const vote = await api('POST', `/api/elections/${draftId}/candidates/${candidateId}/vote`, { as: 'voter_1' });
  assert.equal(vote.status, 400, 'cannot vote in a draft even though its start time has passed');

  assert.equal((await api('PUT', `/api/admin/elections/${draftId}/schedule`, { as: OFFICER })).status, 403);
  const scheduled = await api('PUT', `/api/admin/elections/${draftId}/schedule`, { as: ADMIN });
  assert.equal(scheduled.status, 200);
  assert.equal(scheduled.data.election.status, 'upcoming');

  // Clean up so it doesn't affect later counts
  await models.Election.deleteOne({ _id: draftId });
});

test('voting: ongoing election hides results; votes are recorded once; no counts leak', { skip }, async () => {
  const { electionId, candidates } = state;

  // 8. Ongoing -> no results anywhere
  assert.equal((await api('GET', `/api/elections/${electionId}/results`)).status, 400);
  assert.equal((await api('GET', `/api/officer/elections/${electionId}/final-results`, { as: OFFICER })).status, 400);
  assert.equal((await api('POST', `/api/admin/elections/${electionId}/publish-results`, { as: ADMIN })).status, 400);

  const cast = (voter, name) => api('POST', `/api/elections/${electionId}/candidates/${candidates[name]}/vote`, { as: voter });
  assert.equal((await cast('voter_1', 'Candidate A')).status, 200);
  assert.equal((await cast('voter_2', 'Candidate A')).status, 200);
  assert.equal((await cast('voter_3', 'Candidate B')).status, 200);
  // Existing duplicate-vote prevention still holds
  const dup = await cast('voter_1', 'Candidate B');
  assert.equal(dup.status, 400);
  assert.match(dup.data.message, /already voted/);

  // Public listing never shows tallies or voters before publication
  const pub = await api('GET', `/api/elections/${electionId}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.data.voters, undefined);
  assert.ok(pub.data.candidates.every((c) => c.votes === undefined));
  assert.equal(pub.data.lifecycleStage, 'ONGOING');

  // Officer monitoring: turnout only, no voter identities / tallies
  const monitor = await api('GET', '/api/officer/elections', { as: OFFICER });
  const row = monitor.data.find((e) => e._id === electionId);
  assert.equal(row.votesCast, 3);
  assert.equal(row.eligibleVoters, 4);
  const raw = JSON.stringify(monitor.data);
  assert.ok(!raw.includes('voter_1') && !raw.includes('receipt') && !raw.includes('"votes"'));

  // 29. Officer cannot use admin tooling (live tallies, ending, candidate edits)
  assert.equal((await api('GET', `/api/admin/elections/${electionId}/live-results`, { as: OFFICER })).status, 403);
  assert.equal((await api('PUT', `/api/admin/elections/${electionId}/end`, { as: OFFICER })).status, 403);
  assert.equal((await api('POST', `/api/admin/elections/${electionId}/candidates`, { as: OFFICER, body: { name: 'X' } })).status, 403);

  // 30. Officer cannot reach the voter registry (Aadhaar)
  assert.equal((await api('POST', '/api/voter/registry/register', { as: OFFICER, body: { voterId: 'X', email: 'x@x', phoneNumber: '1', aadhaarNumber: '123456789012' } })).status, 403);
});

test('results: end -> officer reviews & recommends -> only admin publishes', { skip }, async () => {
  const { electionId } = state;

  // 9. Election ends -> voting closes
  assert.equal((await api('PUT', `/api/admin/elections/${electionId}/end`, { as: ADMIN })).status, 200);
  const late = await api('POST', `/api/elections/${electionId}/candidates/${state.candidates['Candidate C']}/vote`, { as: 'voter_4' });
  assert.equal(late.status, 400);

  // Ended but unpublished -> public results still locked
  const locked = await api('GET', `/api/elections/${electionId}/results`);
  assert.equal(locked.status, 403);
  assert.equal(locked.data.resultsPublished, false);

  // 10. Results calculated (officer review)
  const review = await api('GET', `/api/officer/elections/${electionId}/final-results`, { as: OFFICER });
  assert.equal(review.status, 200);
  assert.equal(review.data.lifecycleStage, 'ENDED');
  assert.equal(review.data.totalVotes, 3);
  assert.deepEqual(review.data.results.map((r) => [r.name, r.votes, r.percentage]), [
    ['Candidate A', 2, 66.7],
    ['Candidate B', 1, 33.3],
    ['Candidate C', 0, 0],
  ]);
  assert.deepEqual(review.data.winner.candidates, ['Candidate A']);
  assert.equal(review.data.turnout.votesCast, 3);
  assert.equal(review.data.turnout.eligibleVoters, 4);

  const rec = await api('POST', `/api/officer/elections/${electionId}/recommend-publication`, { as: OFFICER, body: { notes: 'Counts verified.' } });
  assert.equal(rec.status, 200);
  assert.equal((await api('GET', `/api/elections/${electionId}/results`)).status, 403, 'recommendation does not publish');

  // 27 / officer cannot publish, nor via a forged body
  assert.equal((await api('POST', `/api/admin/elections/${electionId}/publish-results`, { as: 'voter_1', body: { resultsPublished: true } })).status, 403);
  assert.equal((await api('POST', `/api/admin/elections/${electionId}/publish-results`, { as: OFFICER, body: { resultsPublished: true } })).status, 403);
  assert.equal((await api('POST', `/api/officer/elections/${electionId}/publish-results`, { as: OFFICER })).status, 404);

  const adminReview = await api('GET', `/api/admin/elections/${electionId}/final-results`, { as: ADMIN });
  assert.equal(adminReview.data.publicationRecommendation.notes, 'Counts verified.');
  assert.equal(adminReview.data.publicationRecommendation.recommendedBy.email, 'officer@college.test');

  // 11. Admin publishes
  const published = await api('POST', `/api/admin/elections/${electionId}/publish-results`, { as: ADMIN });
  assert.equal(published.status, 200);
  assert.equal(published.data.emailRecipients, 3);
  await resultEmailService.waitForResultEmailDispatch(electionId);

  // 12. Published results on the website
  const results = await api('GET', `/api/elections/${electionId}/results`);
  assert.equal(results.status, 200);
  assert.equal(results.data.lifecycleStage, 'RESULTS_PUBLISHED');
  assert.deepEqual(results.data.winner.candidates, ['Candidate A']);
  assert.equal(results.data.results[0].votes, 2);
  assert.ok(!JSON.stringify(results.data).includes('voter_'), 'no voter identities in public results');
  const listed = await api('GET', `/api/elections/${electionId}`);
  assert.equal(listed.data.resultsPublished, true);
});

test('result emails: only actual voters, aggregate-only content, no duplicates', { skip }, async () => {
  const { electionId } = state;

  // 13 / 14. Exactly the 3 voters who voted - not voter_4, not admins
  const recipients = sentEmails.map((m) => m.to).sort();
  assert.deepEqual(recipients, ['voter_1', 'voter_2', 'voter_3'].map(voterEmail).sort());
  assert.ok(!recipients.includes(voterEmail('voter_4')));
  assert.ok(!recipients.includes('admin@college.test') && !recipients.includes('admin2@college.test'));

  // 15. No ballot choice: subject as specified, aggregate results present,
  // and every email is identical apart from the greeting name - so nothing
  // in it can depend on how that recipient voted (voter_1/2 chose A,
  // voter_3 chose B).
  for (const mail of sentEmails) {
    assert.equal(mail.subject, 'Election Results Published — MIT Student Council Election 2026');
    assert.match(mail.text, /Candidate A \(Party A\) — 2 votes — 66\.7%/);
    assert.match(mail.text, /Candidate B \(Party B\) — 1 vote — 33\.3%/);
    assert.match(mail.text, /Winner:\nCandidate A/);
    assert.match(mail.text, /Thank you for participating in the election\./);
    assert.doesNotMatch(mail.text, /you voted|your vote|voted for|receipt|aadhaar|9000000/i);
  }
  const normalize = (mail) => mail.text.replace(/^Hello .*,/, 'Hello X,');
  assert.equal(new Set(sentEmails.map(normalize)).size, 1);
  assert.equal(new Set(sentEmails.map((m) => m.html.replace(/Hello [^,]*,/, 'Hello X,'))).size, 1);
  assert.match(sentEmails.find((m) => m.to === voterEmail('voter_1')).text, /^Hello Voter1,/);

  const status = await api('GET', `/api/admin/elections/${electionId}/result-emails`, { as: ADMIN });
  assert.equal(status.data.counts.SENT, 3);
  assert.equal(status.data.counts.total, 3);

  // 16. Publishing again or retrying does not resend
  sentEmails.length = 0;
  assert.equal((await api('POST', `/api/admin/elections/${electionId}/publish-results`, { as: ADMIN })).status, 409);
  const retry = await api('POST', `/api/admin/elections/${electionId}/result-emails/retry`, { as: ADMIN });
  assert.equal(retry.status, 200);
  assert.equal(retry.data.stats.attempted, 0);
  // Concurrent dispatches can't double-send either
  await Promise.all([
    resultEmailService.dispatchResultEmails(new mongoose.Types.ObjectId(electionId), { retryFailed: true }),
    resultEmailService.dispatchResultEmails(new mongoose.Types.ObjectId(electionId), { retryFailed: true }),
  ]);
  assert.equal(sentEmails.length, 0);
  assert.equal(await models.ResultEmailDelivery.countDocuments({ election: electionId }), 3);
});

test('result emails: failed deliveries are recorded and can be retried safely', { skip }, async () => {
  // A second election, voted on by voter_1 and voter_2
  const election = await models.Election.create({
    title: 'Hostel Committee Election',
    status: 'upcoming',
    startTime: new Date(Date.now() - 60_000),
    endTime: new Date(Date.now() + hour),
    candidates: (await models.Candidate.create([{ name: 'H1' }, { name: 'H2' }])).map((c) => c._id),
  });
  const [h1] = election.candidates;
  for (const v of ['voter_1', 'voter_2']) {
    assert.equal((await api('POST', `/api/elections/${election._id}/candidates/${h1}/vote`, { as: v })).status, 200);
  }
  await api('PUT', `/api/admin/elections/${election._id}/end`, { as: ADMIN });

  // voter_2's mailbox is unreachable
  const delivered = [];
  emailService.setEmailSenderOverride(async (mail) => {
    if (mail.to === voterEmail('voter_2')) throw new Error('SMTP 550 mailbox unavailable');
    delivered.push(mail.to);
    return { delivered: true };
  });

  const published = await api('POST', `/api/admin/elections/${election._id}/publish-results`, { as: ADMIN });
  assert.equal(published.status, 200);
  await resultEmailService.waitForResultEmailDispatch(election._id);
  assert.deepEqual(delivered, [voterEmail('voter_1')]);

  const status = await api('GET', `/api/admin/elections/${election._id}/result-emails`, { as: ADMIN });
  assert.equal(status.data.counts.SENT, 1);
  assert.equal(status.data.counts.FAILED, 1);
  assert.equal(status.data.failed[0].email, voterEmail('voter_2'));
  assert.match(status.data.failed[0].lastError, /mailbox unavailable/);

  // Election result is unaffected by the failure
  const results = await api('GET', `/api/elections/${election._id}/results`);
  assert.equal(results.status, 200);
  assert.equal(results.data.results.find((r) => r.name === 'H1').votes, 2);

  // Only admins can retry
  assert.equal((await api('POST', `/api/admin/elections/${election._id}/result-emails/retry`, { as: OFFICER })).status, 403);

  // Retry once the mailbox recovers: only voter_2 is re-sent
  delivered.length = 0;
  emailService.setEmailSenderOverride(async (mail) => { delivered.push(mail.to); return { delivered: true }; });
  const retry = await api('POST', `/api/admin/elections/${election._id}/result-emails/retry`, { as: ADMIN });
  assert.equal(retry.status, 200);
  assert.deepEqual(delivered, [voterEmail('voter_2')]);
  assert.equal(retry.data.counts.SENT, 2);
  assert.equal(retry.data.counts.FAILED, 0);

  const row = await models.ResultEmailDelivery.findOne({ election: election._id, clerkId: 'voter_2' });
  assert.equal(row.attempts, 2);
  const row1 = await models.ResultEmailDelivery.findOne({ election: election._id, clerkId: 'voter_1' });
  assert.equal(row1.attempts, 1, 'successful delivery never resent');

  emailService.setEmailSenderOverride(async (mail) => { sentEmails.push(mail); return { delivered: true }; });
});

test('complaints: voter -> admin only; owner-only visibility; admin responds and resolves', { skip }, async () => {
  // 18. Voter raises a complaint
  const created = await api('POST', '/api/complaints', {
    as: 'voter_1',
    body: {
      electionId: state.electionId,
      category: 'TECHNICAL_PROBLEM',
      subject: 'Unable to cast vote',
      description: 'The vote button did nothing on my phone.',
      clerkId: 'voter_2', // must be ignored - owner comes from the session
      status: 'RESOLVED',
    },
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.message, 'Your complaint has been submitted to the Admin.');
  const year = new Date().getFullYear();
  assert.match(created.data.referenceId, new RegExp(`^CMP-${year}-\\d{5}$`));
  assert.equal(created.data.complaint.status, 'OPEN');
  const ref = created.data.referenceId;
  const stored = await models.Complaint.findOne({ referenceId: ref });
  assert.equal(stored.clerkId, 'voter_1');

  const second = await api('POST', '/api/complaints', { as: 'voter_1', body: { category: 'OTHER', subject: 'Spam', description: 'Test' } });
  assert.notEqual(second.data.referenceId, ref, 'unique reference IDs');
  assert.equal((await api('POST', '/api/complaints', { as: 'voter_1', body: { category: 'NOPE', subject: 'x', description: 'y' } })).status, 400);
  assert.equal((await api('POST', '/api/complaints', { body: { category: 'OTHER', subject: 'x', description: 'y' } })).status, 401);

  // 20. Officers can't see or manage complaints
  assert.equal((await api('GET', '/api/admin/complaints', { as: OFFICER })).status, 403);
  assert.equal((await api('PUT', `/api/admin/complaints/${stored._id}`, { as: OFFICER, body: { status: 'RESOLVED', adminResponse: 'x' } })).status, 403);
  assert.equal((await api('GET', '/api/officer/complaints', { as: OFFICER })).status, 404);
  assert.equal((await api('GET', '/api/admin/complaints', { as: 'voter_1' })).status, 403);

  // 19 / 21. Admin sees it, with filters & search
  const all = await api('GET', '/api/admin/complaints', { as: ADMIN });
  assert.equal(all.status, 200);
  const found = all.data.find((c) => c.referenceId === ref);
  assert.equal(found.complainant.email, 'clerk_voter_1@mail.test');
  assert.equal(found.election.title, 'MIT Student Council Election 2026');
  assert.equal((await api('GET', `/api/admin/complaints?search=${ref}`, { as: ADMIN })).data.length, 1);
  assert.equal((await api('GET', '/api/admin/complaints?category=TECHNICAL_PROBLEM', { as: ADMIN })).data.length, 1);
  assert.equal((await api('GET', `/api/admin/complaints?electionId=${state.electionId}`, { as: ADMIN })).data.length, 1);
  assert.equal((await api('GET', '/api/admin/complaints?status=OPEN', { as: ADMIN })).data.length, 2);
  assert.equal((await api('GET', `/api/admin/complaints/${ref}`, { as: ADMIN })).data.referenceId, ref);

  // 22. Admin responds
  const review = await api('PUT', `/api/admin/complaints/${stored._id}`, {
    as: ADMIN,
    body: { status: 'UNDER_REVIEW', adminResponse: 'Your issue is currently being investigated.' },
  });
  assert.equal(review.status, 200);
  assert.equal(review.data.complaint.status, 'UNDER_REVIEW');

  // 24. Voter sees their status and the response
  const mine = await api('GET', '/api/complaints/my', { as: 'voter_1' });
  const myComplaint = mine.data.find((c) => c.referenceId === ref);
  assert.equal(myComplaint.status, 'UNDER_REVIEW');
  assert.equal(myComplaint.adminResponse, 'Your issue is currently being investigated.');
  assert.equal(myComplaint.respondedBy, undefined, 'no internal admin ids exposed to voters');

  // 25. Another voter can't see it
  const other = await api('GET', '/api/complaints/my', { as: 'voter_2' });
  assert.equal(other.data.length, 0);
  assert.equal((await api('GET', `/api/complaints/my/${ref}`, { as: 'voter_2' })).status, 404);
  assert.equal((await api('GET', `/api/complaints/my/${ref}`, { as: 'voter_1' })).status, 200);

  // 23. Resolve / reject; closed complaints are final
  const resolved = await api('PUT', `/api/admin/complaints/${stored._id}`, {
    as: ADMIN,
    body: { status: 'RESOLVED', adminResponse: 'The issue has been investigated and fixed.' },
  });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.data.complaint.status, 'RESOLVED');
  assert.equal((await api('PUT', `/api/admin/complaints/${stored._id}`, { as: ADMIN, body: { status: 'OPEN' } })).status, 409);

  const secondId = (await models.Complaint.findOne({ referenceId: second.data.referenceId }))._id;
  assert.equal((await api('PUT', `/api/admin/complaints/${secondId}`, { as: ADMIN, body: { status: 'REJECTED' } })).status, 400, 'must respond before rejecting');
  const rejected = await api('PUT', `/api/admin/complaints/${secondId}`, { as: ADMIN, body: { status: 'REJECTED', adminResponse: 'Not an election issue.' } });
  assert.equal(rejected.data.complaint.status, 'REJECTED');
});

test('roles: frontend cannot self-assign roles; only admin appoints officers', { skip }, async () => {
  // 32. Registering with a forged role yields a plain user
  const reg = await api('POST', '/api/auth/register', {
    as: 'newbie',
    body: { clerkId: 'newbie', email: 'newbie@mail.test', firstName: 'New', role: 'admin' },
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.role, 'user');
  const roleCheck = await api('POST', '/api/check-admin', { as: 'newbie', body: { clerkId: ADMIN } });
  assert.deepEqual(roleCheck.data, { isAdmin: false, role: 'user' });

  const newbie = await models.User.findOne({ clerkId: 'newbie' });
  assert.equal((await api('PUT', `/api/admin/users/${newbie._id}/role`, { as: 'newbie', body: { role: 'officer' } })).status, 403);
  assert.equal((await api('PUT', `/api/admin/users/${newbie._id}/role`, { as: OFFICER, body: { role: 'officer' } })).status, 403);
  assert.equal((await api('PUT', `/api/admin/users/${newbie._id}/role`, { as: ADMIN, body: { role: 'admin' } })).status, 400);

  const promoted = await api('PUT', `/api/admin/users/${newbie._id}/role`, { as: ADMIN, body: { role: 'officer' } });
  assert.equal(promoted.status, 200);
  assert.equal(promoted.data.user.role, 'officer');
  assert.equal((await api('GET', '/api/officer/proposals', { as: 'newbie' })).status, 200);

  const admin2 = await models.User.findOne({ clerkId: ADMIN_NONVOTER });
  assert.equal((await api('PUT', `/api/admin/users/${admin2._id}/role`, { as: ADMIN, body: { role: 'user' } })).status, 403, 'admins cannot be demoted via API');

  // Officers cannot see other officers' proposals
  assert.equal((await api('GET', `/api/officer/proposals/${state.proposalId}`, { as: 'newbie' })).status, 404);
});
