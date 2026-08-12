import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';

// Get all elections
export const getAllElections = async (req, res) => {
    try {
      const elections = await Election.find().populate({
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
        .populate('candidates');

      if (!election) {
        return res.status(404).json({ message: 'Election not found' });
      }
      res.status(200).json(election);
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving election', error: error.message });
    }
};



export const castVote = async (req, res) => {
  try {
      const { electionId, candidateId } = req.params;
      const { clerkId } = req.body;

      // Check if clerkId is provided
      if (!clerkId) {
          return res.status(400).json({ message: 'clerkId is required' });
      }

      // Find the election and check its status
      const election = await Election.findById(electionId).populate('candidates');
      if (!election) {
          return res.status(404).json({ message: 'Election not found' });
      }
      if (election.status !== 'ongoing') {
          return res.status(400).json({ message: 'Election is not currently open for voting' });
      }

      // Check if the voter has already voted in this election
      const alreadyVoted = election.voters.some(voter => voter.clerkId === clerkId);
      if (alreadyVoted) {
          return res.status(400).json({ message: 'You have already voted in this election' });
      }

      // Check if the candidate exists in the election's candidates array
      const candidate = election.candidates.find(candidate => candidate._id.toString() === candidateId);
      if (!candidate) {
          return res.status(404).json({ message: 'Candidate not found in this election' });
      }

      // Increment the candidate's vote count in the database directly
      await Candidate.findByIdAndUpdate(candidate._id, { $inc: { votes: 1 } });

      // Add the voter to the election's voters array
      election.voters.push({ clerkId });
      await election.save();

      res.status(200).json({ message: 'Vote cast successfully', election });
  } catch (error) {
      res.status(500).json({ message: 'Error casting vote', error: error.message });
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



