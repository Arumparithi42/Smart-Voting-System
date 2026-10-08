// In-app election reminders. A lightweight in-process scheduler calls
// runNotificationTick() every minute (NOTIFICATION_INTERVAL_MS); it works
// out which reminder stage each election is in from the SERVER clock and
// fans out notifications. Every notification is upserted on a unique
// (clerkId, dedupeKey), so ticks can overlap, the server can restart, or a
// second instance can run - no user ever gets the same reminder twice.
import Election from '../models/Election.js';
import Notification from '../models/Notification.js';
import VoterIdentity from '../models/VoterIdentity.js';
import User from '../models/User.js';

const HOUR = 60 * 60 * 1000;
// Don't announce "started"/"ended" for elections that changed state long
// before the scheduler noticed (e.g. first deploy, long downtime).
const CATCH_UP_WINDOW = 24 * HOUR;

const formatWhen = (date) => new Date(date).toLocaleString('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
});

const formatTime = (date) => new Date(date).toLocaleTimeString('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
});

// Creates one notification per recipient; existing (clerkId, dedupeKey)
// pairs are left untouched. Returns how many were newly created.
export const notifyUsers = async (clerkIds, { stageKey, election, type, title, message, link }) => {
  const unique = [...new Set(clerkIds.filter(Boolean))];
  if (!unique.length) return 0;
  const dedupeKey = election ? `${stageKey}:${election}` : stageKey;
  const ops = unique.map((clerkId) => ({
    updateOne: {
      filter: { clerkId, dedupeKey },
      update: { $setOnInsert: { clerkId, dedupeKey, election, type, title, message, link, isRead: false } },
      upsert: true,
    },
  }));
  try {
    const result = await Notification.bulkWrite(ops, { ordered: false });
    return result.upsertedCount || 0;
  } catch (error) {
    // Concurrent upserts racing on the unique index - the row exists.
    const onlyDuplicates = error?.writeErrors?.length
      && error.writeErrors.every((e) => (e.code ?? e.err?.code) === 11000);
    if (!onlyDuplicates) throw error;
    return error.result?.upsertedCount ?? 0;
  }
};

// Users an election reminder is relevant to: voters whose registry record
// is linked to an account (the people who can actually vote here).
const eligibleVoterClerkIds = async () => {
  const voters = await VoterIdentity.find({ clerkId: { $exists: true, $ne: null } }).select('clerkId');
  return voters.map((v) => v.clerkId);
};

// Which reminder stages apply to this election right now.
export const dueStages = (election, now) => {
  const start = election.startTime?.getTime();
  const end = election.endTime?.getTime();
  if (!start || !end || Number.isNaN(start) || Number.isNaN(end)) return [];
  const t = now.getTime();
  const stages = [];
  if (t >= start - 24 * HOUR && t < start - HOUR) stages.push('starting-24h');
  if (t >= start - HOUR && t < start) stages.push('starting-1h');
  if (t >= start && t < end && t - start < CATCH_UP_WINDOW) stages.push('started');
  if (t >= end - HOUR && t < end) stages.push('ending-1h');
  if (t >= end && t - end < CATCH_UP_WINDOW) stages.push('ended');
  return stages;
};

const stageContent = (stage, election) => {
  const link = `/explore/${election._id}`;
  switch (stage) {
    case 'starting-24h':
      return { type: 'ELECTION_STARTING', title: 'Upcoming Election Reminder', link,
        message: `${election.title} starts within 24 hours - on ${formatWhen(election.startTime)}.` };
    case 'starting-1h':
      return { type: 'ELECTION_STARTING', title: 'Election Starting Soon', link,
        message: `${election.title} starts at ${formatTime(election.startTime)}. Make sure your voter verification is complete.` };
    case 'started':
      return { type: 'ELECTION_STARTED', title: 'Voting Is Now Open', link: `/vote/${election._id}`,
        message: `${election.title} is now open for voting until ${formatWhen(election.endTime)}.` };
    case 'ending-1h':
      return { type: 'ELECTION_ENDING', title: 'Election Ending Soon', link: `/vote/${election._id}`,
        message: `${election.title} closes at ${formatTime(election.endTime)}. You have not voted yet.` };
    case 'ended':
      return { type: 'ELECTION_ENDED', title: 'Voting Closed', link,
        message: `Voting for ${election.title} has closed. Results will be shared once the Admin publishes them.` };
    default:
      return null;
  }
};

export const runNotificationTick = async (now = new Date()) => {
  // Drafts are invisible to voters, so they never generate reminders.
  const elections = await Election.find({
    status: { $ne: 'draft' },
    startTime: { $lte: new Date(now.getTime() + 24 * HOUR) },
    endTime: { $gte: new Date(now.getTime() - CATCH_UP_WINDOW) },
  }).select('title startTime endTime voters.clerkId notificationStagesSent');

  let created = 0;
  let eligible = null;
  for (const election of elections) {
    const pending = dueStages(election, now).filter((s) => !election.notificationStagesSent?.includes(s));
    for (const stage of pending) {
      eligible ??= await eligibleVoterClerkIds();
      let recipients = eligible;
      if (stage === 'ending-1h') {
        // Only nudge people who haven't voted (they only ever learn that
        // about themselves - the notification goes to them alone).
        const voted = new Set(election.voters.map((v) => v.clerkId));
        recipients = eligible.filter((id) => !voted.has(id));
      }
      created += await notifyUsers(recipients, { stageKey: stage, election: election._id, ...stageContent(stage, election) });
      await Election.updateOne({ _id: election._id }, { $addToSet: { notificationStagesSent: stage } });
    }
  }
  return created;
};

// Called by the admin publish endpoint. Results are public once published,
// so every eligible voter is told; it says nothing about how anyone voted.
export const notifyResultsPublished = async (election) => notifyUsers(await eligibleVoterClerkIds(), {
  stageKey: 'results-published',
  election: election._id,
  type: 'RESULTS_PUBLISHED',
  title: 'Results Published',
  message: `The official results for ${election.title} are now available.`,
  link: `/result/${election._id}`,
});

export const notifyComplaintUpdated = async (complaint) => notifyUsers([complaint.clerkId], {
  // One notification per status change / response (updatedAt makes it unique).
  stageKey: `complaint:${complaint.referenceId}:${complaint.status}:${new Date(complaint.updatedAt).getTime()}`,
  type: 'COMPLAINT_UPDATED',
  title: `Complaint ${complaint.referenceId} updated`,
  message: `Your complaint "${complaint.subject}" is now ${complaint.status.replace('_', ' ').toLowerCase()}.`,
  link: '/dashboard/complaints',
});

// ---- Workflow notifications (admins / officers / feedback) ----

const adminClerkIds = async () => (await User.find({ role: 'admin' }).select('clerkId')).map((u) => u.clerkId);

// New or resubmitted Election Officer proposal -> every admin.
export const notifyProposalSubmitted = async (proposal, { resubmitted = false } = {}) => {
  const officer = await User.findById(proposal.proposedBy).select('firstName lastName');
  const who = officer ? `${officer.firstName} ${officer.lastName || ''}`.trim() : 'An Election Officer';
  return notifyUsers(await adminClerkIds(), {
    stageKey: `proposal-submitted:${proposal._id}:${new Date(proposal.updatedAt).getTime()}`,
    type: 'PROPOSAL_SUBMITTED',
    title: resubmitted ? 'Revised Election Request Submitted' : 'New Election Request Submitted',
    message: resubmitted
      ? `${who} revised and resubmitted the election request "${proposal.title}". Please review it.`
      : `${who} submitted a new election request: "${proposal.title}". Please review it.`,
    link: '/dashboard/admin/proposals',
  });
};

const PROPOSAL_DECISIONS = {
  REVISION_REQUESTED: {
    type: 'PROPOSAL_REVISION_REQUESTED',
    title: 'Revision Requested',
    message: (p) => `The Admin requested a revision to your election proposal "${p.title}"${p.adminFeedback ? `: ${p.adminFeedback}` : '.'} Please update and resubmit it.`,
  },
  APPROVED: {
    type: 'PROPOSAL_APPROVED',
    title: 'Proposal Approved',
    message: (p) => `Your election proposal "${p.title}" was approved and the official election has been created.`,
  },
  REJECTED: {
    type: 'PROPOSAL_REJECTED',
    title: 'Proposal Rejected',
    message: (p) => `Your election proposal "${p.title}" was rejected${p.adminFeedback ? `: ${p.adminFeedback}` : '.'}`,
  },
};

// Admin decision on a proposal -> the officer who proposed it.
export const notifyProposalDecision = async (proposal) => {
  const content = PROPOSAL_DECISIONS[proposal.status];
  if (!content) return 0;
  const officer = await User.findById(proposal.proposedBy).select('clerkId');
  if (!officer) return 0;
  return notifyUsers([officer.clerkId], {
    stageKey: `proposal-${proposal.status}:${proposal._id}:${new Date(proposal.reviewedAt || proposal.updatedAt).getTime()}`,
    type: content.type,
    title: content.title,
    message: content.message(proposal).slice(0, 1000),
    link: '/dashboard/officer/proposals',
  });
};

export const notifyComplaintSubmitted = async (complaint) => notifyUsers(await adminClerkIds(), {
  stageKey: `complaint-submitted:${complaint.referenceId}`,
  type: 'COMPLAINT_SUBMITTED',
  title: 'New Complaint Received',
  message: `Complaint ${complaint.referenceId}: "${complaint.subject}".`,
  link: '/dashboard/admin/complaints',
});

export const notifyFeedbackSubmitted = async (feedback) => notifyUsers(await adminClerkIds(), {
  stageKey: `feedback-submitted:${feedback.referenceId}`,
  type: 'FEEDBACK_SUBMITTED',
  title: 'New Feedback Received',
  message: `Feedback ${feedback.referenceId}: "${feedback.subject}".`,
  link: '/dashboard/admin/feedback',
});

export const notifyFeedbackUpdated = async (feedback) => notifyUsers([feedback.clerkId], {
  stageKey: `feedback:${feedback.referenceId}:${feedback.status}:${new Date(feedback.updatedAt).getTime()}`,
  type: 'FEEDBACK_UPDATED',
  title: `Feedback ${feedback.referenceId} updated`,
  message: `Your feedback "${feedback.subject}" is now ${feedback.status.replace('_', ' ').toLowerCase()}${feedback.adminReply ? ' - the Admin replied.' : '.'}`,
  link: '/dashboard/feedback',
});

let timer = null;
export const startNotificationScheduler = () => {
  const interval = Number(process.env.NOTIFICATION_INTERVAL_MS ?? 60_000);
  if (!interval || timer) return;
  const tick = () => runNotificationTick().catch((error) => console.error('Notification tick failed:', error.message));
  tick();
  timer = setInterval(tick, interval);
  timer.unref?.();
};
