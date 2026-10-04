import mongoose from 'mongoose';
import Election from '../models/Election.js';
import VoterIdentity from '../models/VoterIdentity.js';
import ResultEmailDelivery from '../models/ResultEmailDelivery.js';
import { getEffectiveElectionStatus, getElectionLifecycleStage } from '../utils/electionStatus.js';
import { finalizeElectionResults, buildResultSummary } from '../utils/electionResults.js';
import {
  queueResultEmails,
  dispatchResultEmails,
  getResultEmailStats,
} from '../services/resultEmailService.js';
import { notifyResultsPublished } from '../services/notificationService.js';

const loadElection = async (req, res) => {
  const { electionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(electionId)) {
    res.status(404).json({ message: 'Election not found' });
    return null;
  }
  const election = await Election.findById(electionId);
  if (!election) {
    res.status(404).json({ message: 'Election not found' });
    return null;
  }
  return election;
};

const recommendationView = (election) => {
  const rec = election.publicationRecommendation;
  if (!rec?.recommendedAt) return null;
  return {
    recommendedAt: rec.recommendedAt,
    notes: rec.notes,
    recommendedBy: rec.recommendedBy && rec.recommendedBy.firstName !== undefined
      ? { firstName: rec.recommendedBy.firstName, lastName: rec.recommendedBy.lastName, email: rec.recommendedBy.email }
      : rec.recommendedBy,
  };
};

// ===================== STAFF (OFFICER + ADMIN) =====================

// Read-only monitoring list. Officers see status and turnout only - never
// per-candidate tallies while voting is open (same rule as before: live
// tallies are admin-only, see getLiveResults).
export const getMonitoredElections = async (req, res) => {
  try {
    const elections = await Election.find()
      .select('-voters.receiptId -voters.clerkId')
      .sort({ startTime: -1 });
    const eligibleVoters = await VoterIdentity.countDocuments();

    res.status(200).json(elections.map((el) => ({
      _id: el._id,
      title: el.title,
      description: el.description,
      category: el.category,
      startTime: el.startTime,
      endTime: el.endTime,
      effectiveStatus: getEffectiveElectionStatus(el),
      lifecycleStage: getElectionLifecycleStage(el),
      candidateCount: el.candidates.length,
      votesCast: el.voters.length,
      eligibleVoters,
      resultsPublished: !!el.resultsPublished,
      resultsPublishedAt: el.resultsPublishedAt,
      fromProposal: !!el.proposalId,
      publicationRecommended: !!el.publicationRecommendation?.recommendedAt,
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching elections', error: error.message });
  }
};

// Final aggregate results for review BEFORE publication. Only once voting
// has closed - calling this finalizes (locks) the result exactly like the
// old public endpoint did on first view.
export const getFinalResultsForReview = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;

    if (getEffectiveElectionStatus(election) !== 'completed') {
      return res.status(400).json({ message: 'Final results are only available after the election has ended.' });
    }

    const finalized = await finalizeElectionResults(election._id);
    await finalized.populate('publicationRecommendation.recommendedBy', 'firstName lastName email');

    res.status(200).json({
      ...buildResultSummary(finalized),
      lifecycleStage: getElectionLifecycleStage(finalized),
      publicationRecommendation: recommendationView(finalized),
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error fetching final results', error: error.message });
  }
};

// ========================= ELECTION OFFICER =========================

// "Recommend publication" - advice to the admin; publishes nothing.
export const recommendPublication = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;

    if (getEffectiveElectionStatus(election) !== 'completed') {
      return res.status(400).json({ message: 'Publication can only be recommended after the election has ended.' });
    }
    if (election.resultsPublished) {
      return res.status(409).json({ message: 'Results have already been published.' });
    }

    const notes = typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : undefined;
    await Election.updateOne(
      { _id: election._id },
      { $set: { publicationRecommendation: { recommendedBy: req.dbUser._id, recommendedAt: new Date(), notes } } }
    );

    res.status(200).json({ message: 'Publication recommended to Admin.' });
  } catch (error) {
    res.status(500).json({ message: 'Error recommending publication', error: error.message });
  }
};

// ============================== ADMIN ==============================

// Official publication. Verifies: election exists, has ended, caller is an
// admin (route middleware), and results are not already published. The
// publish flag is set with a conditional update, so a double-click or a
// replayed request publishes (and queues emails) exactly once.
export const publishResults = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;

    if (getEffectiveElectionStatus(election) !== 'completed') {
      return res.status(400).json({ message: 'Results can only be published after the election has ended.' });
    }
    if (election.resultsPublished) {
      return res.status(409).json({ message: 'Results have already been published for this election.' });
    }

    await finalizeElectionResults(election._id);

    const published = await Election.findOneAndUpdate(
      { _id: election._id, resultsPublished: { $ne: true } },
      { $set: { resultsPublished: true, resultsPublishedAt: new Date(), resultsPublishedBy: req.dbUser._id } },
      { new: true }
    );
    if (!published) {
      return res.status(409).json({ message: 'Results have already been published for this election.' });
    }

    const recipients = await queueResultEmails(published);

    // In-app "Results Published" notification (idempotent per user).
    await notifyResultsPublished(published).catch((error) => {
      console.error(`Results notification failed for election ${published._id}:`, error.message);
    });

    // Sending happens in the background so publishing doesn't wait on
    // hundreds of SMTP round-trips. Failures are recorded per delivery row
    // and can be retried; they never affect the published result.
    dispatchResultEmails(published._id).catch((error) => {
      console.error(`Result email dispatch failed for election ${published._id}:`, error.message);
    });

    res.status(200).json({
      message: `Results published. Result emails are being sent to ${recipients} voter(s) who voted.`,
      resultsPublishedAt: published.resultsPublishedAt,
      emailRecipients: recipients,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error publishing results', error: error.message });
  }
};

export const getResultEmailStatus = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;

    const counts = await getResultEmailStats(election._id);
    const failed = await ResultEmailDelivery.find({ election: election._id, status: 'FAILED' })
      .select('email recipientName attempts lastError lastAttemptAt')
      .sort({ lastAttemptAt: -1 })
      .limit(200);

    res.status(200).json({
      resultsPublished: !!election.resultsPublished,
      resultsPublishedAt: election.resultsPublishedAt,
      queuedAt: election.resultEmailsQueuedAt,
      counts,
      failed,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching email status', error: error.message });
  }
};

// Retry failed deliveries only. SENT rows are never re-sent. Re-running the
// (idempotent) queue step first also recovers from a crash between
// publishing and queueing.
export const retryResultEmails = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;
    if (!election.resultsPublished) {
      return res.status(400).json({ message: 'Results have not been published yet.' });
    }

    await queueResultEmails(election);
    const stats = await dispatchResultEmails(election._id, { retryFailed: true });
    const counts = await getResultEmailStats(election._id);

    res.status(200).json({
      message: `Retried ${stats.attempted} delivery(ies): ${stats.sent} sent, ${stats.failed} failed.`,
      stats,
      counts,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrying result emails', error: error.message });
  }
};
