import crypto from 'crypto';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';

// Get all elections
export const getAllElections = async (req, res) => {
    try {
      const elections = await Election.find()
        .select('-voters') // never expose voter identities/receipts publicly
        .populate({
          path: 'candidates',
          select: 'name partyName votes', 
        });
      res.status(200).json(elections);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving elections', error: error.message });
    }
  };


// Get election by election ID
export const getElectionById = async (req, res) => {
    try {
      const { id } = req.params;

      const election = await Election.findById(id)
        .select('-voters') // never expose voter identities/receipts publicly
        .populate('candidates');

      if (!election) {
        return res.status(404).json({ message: 'Election not found' });
      }
      res.status(200).json(election);
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

      // The voter's identity comes from the verified Clerk session
      // (req.clerkId, set by the requireAuth middleware) - never from the
      // request body. Previously any caller could supply an arbitrary
      // clerkId and vote as/for anyone, any number of times.
      const clerkId = req.clerkId;
      if (!clerkId) {
          return res.status(401).json({ message: 'Authentication required' });
      }

      const election = await Election.findById(electionId);
      if (!election) {
          return res.status(404).json({ message: 'Election not found' });
      }
      if (election.status !== 'ongoing') {
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

      // Record the vote atomically: this single findOneAndUpdate only
      // succeeds if the election is still ongoing AND this voter hasn't
      // already been recorded, so two simultaneous requests from the same
      // voter can't both slip through (the earlier code re-checked the
      // voters array in JS first, which is a classic check-then-act race).
      // We deliberately avoid multi-document transactions here since they
      // require a MongoDB replica set, which a standard/local deployment
      // may not have.
      const updatedElection = await Election.findOneAndUpdate(
          {
              _id: electionId,
              status: 'ongoing',
              candidates: candidateId,
              'voters.clerkId': { $ne: clerkId },
          },
          { $push: { voters: { clerkId, receiptId, votedAt } } },
          { new: true }
      );

      if (!updatedElection) {
          // Someone beat us to it (already voted) or election state changed
          // between our checks above and now - re-check to give an accurate
          // message rather than a generic failure.
          const recheck = await Election.findById(electionId);
          if (!recheck || recheck.status !== 'ongoing') {
              return res.status(400).json({ message: 'Election is not currently open for voting' });
          }
          return res.status(400).json({ message: 'You have already voted in this election' });
      }

      try {
          await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });
      } catch (incrementError) {
          // Roll back the voter record so a failed increment can't silently
          // lock the voter out of an election they never actually got
          // counted in.
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


//Show result of an election
export const getElectionResults = async (req, res) => {
    try {
        const { electionId } = req.params;
        const election = await Election.findById(electionId).populate({
            path: 'candidates',
            select: 'name partyName votes',
        });

        if (!election) {
            return res.status(404).json({ message: 'Election not found' });
        }

        // Check if the election has been completed
        if (election.status !== 'completed') {
            return res.status(400).json({ message: 'Election results are not available until the election is completed' });
        }

        // Return the election results with candidate details and vote counts
        const results = election.candidates.map(candidate => ({
            name: candidate.name,
            partyName: candidate.partyName,
            votes: candidate.votes,
        }));

        res.status(200).json({
            electionTitle: election.title,
            description: election.description,
            results,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving election results', error: error.message });
    }
};


// Admin-only: live tallies for an election that hasn't closed yet.
// Kept separate from getElectionResults (which is public but only unlocks
// once an election is 'completed') on purpose - showing running totals to
// the public mid-election can bias turnout/voting behaviour (a bandwagon
// effect), so real voting systems restrict that view to administrators.
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

        const totalVotes = election.voters.length;
        const results = election.candidates.map(candidate => ({
            name: candidate.name,
            partyName: candidate.partyName,
            votes: candidate.votes,
        }));

        res.status(200).json({
            electionTitle: election.title,
            status: election.status,
            totalVotes,
            results,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving live results', error: error.message });
    }
};
