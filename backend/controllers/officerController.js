import mongoose from 'mongoose';
import Election from '../models/Election.js';
import VoterIdentity from '../models/VoterIdentity.js';
import { getEffectiveElectionStatus, getElectionLifecycleStage } from '../utils/electionStatus.js';

// Read-only election views for Election Officers (admins may use them too).
// Nothing here returns voter identities, receipts, or per-candidate
// tallies while voting is open.

const loadElection = async (req, res) => {
  const { electionId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(electionId)) {
    res.status(404).json({ message: 'Election not found' });
    return null;
  }
  const election = await Election.findById(electionId)
    .select('-voters.clerkId -voters.receiptId')
    .populate('candidates', 'name partyName about profilePhotoUrl partySymbolUrl documents');
  if (!election) {
    res.status(404).json({ message: 'Election not found' });
    return null;
  }
  return election;
};

export const getOfficerElection = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;
    const effectiveStatus = getEffectiveElectionStatus(election);
    res.status(200).json({
      _id: election._id,
      title: election.title,
      description: election.description,
      purpose: election.purpose,
      category: election.category,
      startTime: election.startTime,
      endTime: election.endTime,
      effectiveStatus,
      lifecycleStage: getElectionLifecycleStage(election),
      candidates: election.candidates, // no vote counts selected
      candidatesLocked: !['draft', 'upcoming'].includes(effectiveStatus),
      votesCast: election.voters.length,
      resultsPublished: !!election.resultsPublished,
      resultsPublishedAt: election.resultsPublishedAt,
      publicationRecommended: !!election.publicationRecommendation?.recommendedAt,
      fromProposal: !!election.proposalId,
      manifest: election.manifest?.fileId ? election.manifest : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching election', error: error.message });
  }
};

// Participation analytics: turnout and an hourly "votes cast" timeline built
// only from vote timestamps (who voted is never selected, what they voted
// for is never stored on the voter record at all).
export const getOfficerElectionAnalytics = async (req, res) => {
  try {
    const election = await loadElection(req, res);
    if (!election) return;

    const eligibleVoters = await VoterIdentity.countDocuments();
    const votesCast = election.voters.length;
    const buckets = new Map();
    for (const v of election.voters) {
      if (!v.votedAt) continue;
      const hour = new Date(v.votedAt);
      hour.setUTCMinutes(0, 0, 0);
      const key = hour.toISOString();
      buckets.set(key, (buckets.get(key) || 0) + 1);
    }
    const timeline = [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, votes]) => ({ hour, votes }));

    res.status(200).json({
      electionId: election._id,
      title: election.title,
      lifecycleStage: getElectionLifecycleStage(election),
      eligibleVoters,
      votesCast,
      turnoutPercentage: eligibleVoters > 0 ? Math.round((votesCast / eligibleVoters) * 1000) / 10 : 0,
      candidateCount: election.candidates.length,
      timeline,
      // Per-candidate figures are only available via the final-results
      // review once voting has closed.
      finalResultsAvailable: getEffectiveElectionStatus(election) === 'completed',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
};
