import Election from '../models/Election.js'; 
import Candidate from '../models/Candidate.js';
import { sendBookingConfirmationEmail } from './sendEmail.js';


// Create an election
export const createElection = async (req, res) => {
  try {
    const { title, description } = req.body;
    const newElection = new Election({
      title,
      description,
      status: 'upcoming',
      candidates: [],
      voters: []
    });
    await newElection.save();
    res.status(201).json({ message: 'Election created successfully', election: newElection });
  } catch (error) {
    res.status(500).json({ message: 'Error creating election', error: error.message });
  }
};

// Delete an election
export const deleteElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    await Election.findByIdAndDelete(electionId);
    res.status(200).json({ message: 'Election deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting election', error: error.message });
  }
};

// Add candidate to an election
export const addCandidateToElection = async (req, res) => {
    try {
      const { electionId } = req.params;
      const { name, partyName } = req.body; // Get candidate details from the request body
  
      // Step 1: Create a new candidate
      const newCandidate = new Candidate({ name, partyName });
      await newCandidate.save();
  
      // Step 2: Find the election and add the candidate's ID to its candidates array
      const election = await Election.findById(electionId);
      if (!election) return res.status(404).json({ message: 'Election not found' });
  
      election.candidates.push(newCandidate._id); // Add candidate ID to the election
      await election.save();
  
      res.status(200).json({ message: 'Candidate created and added to election', election });
    } catch (error) {
      res.status(500).json({ message: 'Error adding candidate to election', error: error.message });
    }
  };

// Remove a candidate from an election
export const removeCandidateFromElection = async (req, res) => {
    try {
      const { electionId, candidateId } = req.params; // Get election and candidate IDs from request parameters
      
      // Step 1: Find the election
      const election = await Election.findById(electionId);
      if (!election) return res.status(404).json({ message: 'Election not found' });
  
      // Step 2: Remove candidate from the election's candidates array
      election.candidates = election.candidates.filter(id => id.toString() !== candidateId); // Remove candidate by ID
      await election.save();
  
      res.status(200).json({ message: 'Candidate removed from election', election });
    } catch (error) {
      res.status(500).json({ message: 'Error removing candidate from election', error: error.message });
    }
  };
  

// Start an election
export const startElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: 'Election not found' });

    if (!election.candidates || election.candidates.length === 0) {
      return res.status(400).json({ message: 'Cannot start election: add at least one candidate first' });
    }

    election.status = 'ongoing';
    await election.save();
    res.status(200).json({ message: 'Election started', election });
  } catch (error) {
    res.status(500).json({ message: 'Error starting election', error: error.message });
  }
};

// End an election
export const endElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: 'Election not found' });

    // // Logic to determine the winner (candidate with the most votes)
    // if (election.candidates.length > 0) {
    //   winner = election.candidates.reduce((prev, current) => (prev.votes > current.votes ? prev : current));
    // }

    election.status = 'completed';
    // election.winner = winner?._id; // Uncomment if you want to save the winner's ID in the schema
    await election.save();

    res.status(200).json({ message: 'Election ended', election });
  } catch (error) {
    res.status(500).json({ message: 'Error ending election', error: error.message });
  }
};
