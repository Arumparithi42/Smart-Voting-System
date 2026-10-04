import crypto from 'crypto';
import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import VoterIdentity from '../models/VoterIdentity.js';
import { getEffectiveElectionStatus, getElectionLifecycleStage } from '../utils/electionStatus.js';
import { buildResultSummary } from '../utils/electionResults.js';

// These endpoints are public, but staff (officers/admins) additionally see
// DRAFT elections. Role always comes from our DB, never the request.
const isStaffRequest = async (req) => {
    let userId;
    try {
        ({ userId } = getAuth(req));
    } catch {
        return false;
    }
    if (!userId) return false;
    const user = await User.findOne({ clerkId: userId }).select('role');
    return user?.role === 'admin' || user?.role === 'officer';
};

// Public shape of an election: no voter records, no internal admin
// fields, and no vote counts / winner / turnout until results are
// officially published (running tallies mid-election can bias turnout,
// and unpublished final results are for staff review only).
const toPublicElection = (election) => {
    const {
        voters,
        publicationRecommendation,
        resultsPublishedBy,
        createdBy,
        resultEmailsQueuedAt,
        ...obj
    } = election.toObject();

    if (!obj.resultsPublished) {
        delete obj.winner;
        delete obj.turnout;
        obj.candidates = (obj.candidates || []).map((c) => {
            if (!c || typeof c !== 'object' || !('votes' in c)) return c;
            const { votes, ...rest } = c;
            return rest;
        });
    }

    return {
        ...obj,
        effectiveStatus: getEffectiveElectionStatus(election),
        lifecycleStage: getElectionLifecycleStage(election),
    };
};

// Get all elections
export const getAllElections = async (req, res) => {
    try {
      const filter = (await isStaffRequest(req)) ? {} : { status: { $ne: 'draft' } };
      const elections = await Election.find(filter)
        .select('-voters') // never expose voter identities/receipts publicly
        .populate({
          path: 'candidates',
          select: 'name partyName votes', 
        });
        
      res.status(200).json(elections.map(toPublicElection));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving elections', error: error.message });
    }
  };


// Get election by election ID
export const getElectionById = async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ message: 'Election not found' });
      }

      const election = await Election.findById(id)
        .select('-voters') // never expose voter identities/receipts publicly
        .populate('candidates');

      if (!election || (election.status === 'draft' && !(await isStaffRequest(req)))) {
        return res.status(404).json({ message: 'Election not found' });
      }
      
      res.status(200).json(toPublicElection(election));
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving election', error: error.message });
    }
};


// Generates a voter-facing receipt. It's an HMAC over
// (electionId, clerkId, a random nonce, a timestamp) keyed with a
// server-only secret, so nobody outside the server can forge one - but it
// deliberately does NOT encode which candidate was picked, preserving
// ballot secrecy. The receipt is stored on the voter record and looked up
// verbatim at verification time; the HMAC just makes it infeasible for
// someone to construct a plausible-looking fake receipt for a vote that
// never happened.
const generateReceipt = (electionId, clerkId) => {
    const secret = process.env.RECEIPT_SECRET || process.env.CLERK_SECRET_KEY || 'dev-only-insecure-secret';
    const nonce = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now().toString();
    const payload = `${electionId}:${clerkId}:${nonce}:${timestamp}`;
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 24);
    // Prefixed + chunked purely for readability when a voter copies it down.
    return `VOTE-${signature.slice(0, 8)}-${signature.slice(8, 16)}-${signature.slice(16, 24)}`.toUpperCase();
};

export const castVote = async (req, res) => {
  try {
      const { electionId, candidateId } = req.params;

      const clerkId = req.clerkId;
      if (!clerkId) {
          return res.status(401).json({ message: 'Authentication required' });
      }

      const election = await Election.findById(electionId);
      if (!election) {
          return res.status(404).json({ message: 'Election not found' });
      }
      
      if (election.resultFinalized) {
          return res.status(400).json({ message: 'Results have already been finalized' });
      }

      const effectiveStatus = getEffectiveElectionStatus(election);
      if (effectiveStatus !== 'ongoing') {
          return res.status(400).json({ message: 'Election is not currently open for voting' });
      }

      const candidateInElection = election.candidates.some(
          (id) => id.toString() === candidateId
      );
      if (!candidateInElection) {
          return res.status(404).json({ message: 'Candidate not found in this election' });
      }

      const alreadyVoted = election.voters.some((voter) => voter.clerkId === clerkId);
      if (alreadyVoted) {
          return res.status(400).json({ message: 'You have already voted in this election' });
      }

      const receiptId = generateReceipt(electionId, clerkId);
      const votedAt = new Date();

      // Check current timing validity and atomic constraints in DB side also natively if available
      const updatedElection = await Election.findOneAndUpdate(
          {
              _id: electionId,
              status: { $in: ['ongoing', 'upcoming'] }, // Legacy fallback handling if status is still used
              candidates: candidateId,
              'voters.clerkId': { $ne: clerkId },
          },
          { $push: { voters: { clerkId, receiptId, votedAt } } },
          { new: true }
      );

      if (!updatedElection) {
          const recheck = await Election.findById(electionId);
          if (!recheck || getEffectiveElectionStatus(recheck) !== 'ongoing') {
              return res.status(400).json({ message: 'Election is not currently open for voting' });
          }
          return res.status(400).json({ message: 'You have already voted in this election' });
      }

      try {
          await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });
      } catch (incrementError) {
          await Election.updateOne(
              { _id: electionId },
              { $pull: { voters: { clerkId } } }
          );
          throw incrementError;
      }

      res.status(200).json({
          message: 'Vote cast successfully',
          receipt: {
              receiptId,
              electionTitle: updatedElection.title,
              votedAt,
          },
      });
  } catch (error) {
      res.status(500).json({ message: 'Error casting vote', error: error.message });
  }
};


// Lets a voter confirm their vote was recorded using only their receipt ID -
// never reveals which candidate they chose (that's not stored on the
// receipt at all), only that a vote tied to this receipt exists.
export const verifyReceipt = async (req, res) => {
    try {
        const { electionId, receiptId } = req.body;

        if (!electionId || !receiptId) {
            return res.status(400).json({ message: 'electionId and receiptId are required' });
        }

        const election = await Election.findOne(
            { _id: electionId, 'voters.receiptId': receiptId.toUpperCase().trim() },
            { title: 1, 'voters.$': 1 }
        );

        if (!election || !election.voters?.length) {
            return res.status(200).json({ valid: false });
        }

        const voter = election.voters[0];
        res.status(200).json({
            valid: true,
            electionTitle: election.title,
            votedAt: voter.votedAt,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying receipt', error: error.message });
    }
};


// Lets the CURRENTLY SIGNED-IN user check whether they've already voted in
// an election, and see their own receipt again if so. Only ever looks at
// the record matching req.clerkId (the verified session) - never returns
// any other voter's clerkId or receipt.
export const getMyVoteStatus = async (req, res) => {
    try {
        const { electionId } = req.params;
        const clerkId = req.clerkId;

        const election = await Election.findOne(
            { _id: electionId, 'voters.clerkId': clerkId },
            { title: 1, 'voters.$': 1 }
        );

        if (!election || !election.voters?.length) {
            return res.status(200).json({ hasVoted: false });
        }

        const voter = election.voters[0];
        res.status(200).json({
            hasVoted: true,
            electionTitle: election.title,
            votedAt: voter.votedAt,
            receiptId: voter.receiptId || null, // null for votes cast before receipts existed
        });
    } catch (error) {
        res.status(500).json({ message: 'Error checking vote status', error: error.message });
    }
};


// Public results of an election. Available ONLY after an admin has
// officially published them (see resultPublicationController.publishResults)
// - ending the election alone is no longer enough. Aggregate counts only.
export const getElectionResults = async (req, res) => {
    try {
        const { electionId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(electionId)) {
            return res.status(404).json({ message: 'Election not found' });
        }

        const election = await Election.findById(electionId)
            .select('-voters')
            .populate({ path: 'candidates', select: 'name partyName votes profilePhotoUrl partySymbolUrl' });

        if (!election || election.status === 'draft') {
            return res.status(404).json({ message: 'Election not found' });
        }

        const effectiveStatus = getEffectiveElectionStatus(election);
        if (effectiveStatus !== 'completed') {
            return res.status(400).json({ message: 'Election results are not available until the election is completed', resultsPublished: false });
        }
        if (!election.resultsPublished) {
            return res.status(403).json({ message: 'Results for this election have not been published yet.', resultsPublished: false });
        }

        res.status(200).json({
            ...buildResultSummary(election),
            effectiveStatus,
            lifecycleStage: getElectionLifecycleStage(election),
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving election results', error: error.message });
    }
};


export const getLiveResults = async (req, res) => {
    try {
        const { electionId } = req.params;
        const election = await Election.findById(electionId).populate({
            path: 'candidates',
            select: 'name partyName votes',
        });

        if (!election) {
            return res.status(404).json({ message: 'Election not found' });
        }
        
        const effectiveStatus = getEffectiveElectionStatus(election);

        const totalVotes = election.voters.length;
        const eligibleVoters = await VoterIdentity.countDocuments();
        const results = election.candidates.map(candidate => ({
            name: candidate.name,
            partyName: candidate.partyName,
            votes: candidate.votes,
        }));

        res.status(200).json({
            electionTitle: election.title,
            status: effectiveStatus,
            totalVotes,
            eligibleVoters,
            results,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving live results', error: error.message });
    }
};
