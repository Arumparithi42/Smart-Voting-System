import Election from '../models/Election.js';
import VoterIdentity from '../models/VoterIdentity.js';
import { getEffectiveElectionStatus } from './electionStatus.js';

// Finalizes an ended election's results exactly once: computes the
// winner(s) and turnout from the aggregate candidate counters and stores
// them. Safe to call any number of times / concurrently - the
// resultFinalized:false condition on the update means only one caller ever
// does the computation. (Moved here unchanged in behaviour from the old
// lazy finalization in votingController.getElectionResults so publication
// and the staff review screens can share it.)
//
// Returns the election with candidates populated, or null if it does not
// exist. Throws if the election has not ended yet.
export const finalizeElectionResults = async (electionId) => {
  let election = await Election.findById(electionId).populate('candidates');
  if (!election) return null;

  if (getEffectiveElectionStatus(election) !== 'completed') {
    const error = new Error('Election results are not available until the election has ended');
    error.status = 400;
    throw error;
  }

  if (election.resultFinalized) return election;

  const lock = await Election.findOneAndUpdate(
    { _id: electionId, resultFinalized: false },
    { resultFinalized: true, finalizedAt: new Date() },
    { new: true }
  );

  if (!lock) {
    // Another request finalized it first.
    return Election.findById(electionId).populate('candidates');
  }

  const locked = await Election.findById(lock._id).populate('candidates');
  const eligibleVoters = await VoterIdentity.countDocuments();
  const votesCast = locked.voters.length;

  let maxVotes = 0;
  for (const c of locked.candidates) {
    if (c.votes > maxVotes) maxVotes = c.votes;
  }
  const winners = maxVotes > 0
    ? locked.candidates.filter((c) => c.votes === maxVotes).map((c) => c._id)
    : [];

  locked.winner = { candidateIds: winners, votes: maxVotes, isTie: winners.length > 1 };
  locked.turnout = {
    eligibleVoters,
    votesCast,
    percentage: eligibleVoters > 0 ? (votesCast / eligibleVoters) * 100 : 0,
  };
  await locked.save();
  return locked;
};

const round1 = (n) => Math.round(n * 10) / 10;

// Aggregate-only view of a finalized election (candidates populated).
// Used by the public results page, the staff review screens AND the
// result email, so all three always show exactly the same numbers. Never
// contains anything about individual voters.
export const buildResultSummary = (election) => {
  const candidates = election.candidates || [];
  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes || 0), 0);
  const winnerIds = (election.winner?.candidateIds || []).map((id) => id.toString());

  const results = candidates
    .map((c) => ({
      candidateId: c._id,
      name: c.name,
      partyName: c.partyName,
      profilePhotoUrl: c.profilePhotoUrl,
      partySymbolUrl: c.partySymbolUrl,
      votes: c.votes || 0,
      percentage: totalVotes > 0 ? round1(((c.votes || 0) / totalVotes) * 100) : 0,
      isWinner: winnerIds.includes(c._id.toString()),
    }))
    .sort((a, b) => b.votes - a.votes);

  const winners = results.filter((r) => r.isWinner).map((r) => r.name);

  return {
    electionId: election._id,
    electionTitle: election.title,
    description: election.description,
    startTime: election.startTime,
    endTime: election.endTime,
    totalVotes,
    results,
    winner: election.winner
      ? { candidates: winners, votes: election.winner.votes }
      : null,
    isTie: election.winner?.isTie || false,
    turnout: election.turnout,
    resultFinalized: election.resultFinalized,
    finalizedAt: election.finalizedAt,
    resultsPublished: !!election.resultsPublished,
    resultsPublishedAt: election.resultsPublishedAt,
  };
};
