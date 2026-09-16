import Election from '../models/Election.js'; 
import Candidate from '../models/Candidate.js';
import CandidateApplication from '../models/CandidateApplication.js';
import { sendBookingConfirmationEmail } from './sendEmail.js';
import { getEffectiveElectionStatus } from '../utils/electionStatus.js';


// Create an election
export const createElection = async (req, res) => {
  try {
    const { title, description, startTime, endTime } = req.body;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ message: 'startTime and endTime are required' });
    }
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid dates provided for start or end time' });
    }
    
    if (end <= start) {
      return res.status(400).json({ message: 'endTime must be strictly after startTime' });
    }

    const newElection = new Election({
      title,
      description,
      status: 'upcoming',
      startTime: start,
      endTime: end,
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
    
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: 'Election not found' });
    
    const effectiveStatus = getEffectiveElectionStatus(election);
    if (effectiveStatus !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot delete an election after it has started.' });
    }

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
      
      const effectiveStatus = getEffectiveElectionStatus(election);
      if (effectiveStatus !== 'upcoming') {
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }
  
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
  
      const effectiveStatus = getEffectiveElectionStatus(election);
      if (effectiveStatus !== 'upcoming') {
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }

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
    election.startTime = new Date();
    // Ensure end time is at least some time into the future if missing or past
    if (!election.endTime || election.endTime <= election.startTime) {
        election.endTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
    
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

    election.status = 'completed';
    election.endTime = new Date();

    await election.save();

    res.status(200).json({ message: 'Election ended', election });
  } catch (error) {
    res.status(500).json({ message: 'Error ending election', error: error.message });
  }
};


// ========== CANDIDATE REGISTRATION / APPROVAL ========

// Get all applications (optionally filter by status or electionId)
export const getApplications = async (req, res) => {
  try {
    const { status, electionId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (electionId) filter.electionId = electionId;

    const applications = await CandidateApplication.find(filter)
      .populate('electionId', 'title status startTime endTime')
      .populate('reviewedBy', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
};

// Get a specific application by ID
export const getAdminApplicationById = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await CandidateApplication.findById(applicationId)
      .populate('electionId', 'title status startTime endTime')
      .populate('reviewedBy', 'email firstName lastName');

    if (!application) return res.status(404).json({ message: 'Application not found' });
    res.status(200).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching application details', error: error.message });
  }
};

// Approve an application
export const approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const application = await CandidateApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: `Application is already ${application.status}.` });
    }

    const election = await Election.findById(application.electionId);
    if (!election) {
      return res.status(404).json({ message: 'Associated election not found.' });
    }

    // Immediate race-condition check
    const effectiveStatus = getEffectiveElectionStatus(election);
    if (effectiveStatus !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot approve candidates after the election has started or ended.' });
    }

    // Duplicate check for existing official candidate based on the applicationId
    const existingCandidate = await Candidate.findOne({ applicationId: application._id });
    if (existingCandidate) {
      return res.status(400).json({ message: 'A candidate has already been created for this application.' });
    }

    // Transactionally create the Official Candidate
    const newCandidate = new Candidate({
      name: application.fullName,
      partyName: application.partyName,
      profilePhotoUrl: application.profilePhotoUrl,
      partySymbolUrl: application.partySymbolUrl,
      qualification: application.qualification,
      occupation: application.occupation,
      about: application.about,
      manifesto: application.manifesto,
      promises: application.promises,
      applicationId: application._id,
      votes: 0
    });
    
    await newCandidate.save();

    // Attach Official Candidate into Election array
    election.candidates.push(newCandidate._id);
    await election.save();

    // Mark as approved (idempotent wrap)
    application.status = 'approved';
    application.reviewedBy = req.dbUser._id;
    application.reviewedAt = new Date();
    await application.save();

    res.status(200).json({ message: 'Application approved and candidate instantiated successfully.', application });
  } catch (error) {
    res.status(500).json({ message: 'Error approving application', error: error.message });
  }
};

// Reject an application
export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { rejectionReason } = req.body;
    const application = await CandidateApplication.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ message: `Application is already ${application.status}.` });
    }

    const election = await Election.findById(application.electionId);
    if (!election) {
      return res.status(404).json({ message: 'Associated election not found.' });
    }

    const effectiveStatus = getEffectiveElectionStatus(election);
    if (effectiveStatus !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot reject candidates after the election has started or ended.' });
    }
    
    if (!rejectionReason || rejectionReason.trim() === '') {
       return res.status(400).json({ message: 'A reason for rejection must be provided.' });
    }

    // Mark as rejected
    application.status = 'rejected';
    application.rejectionReason = rejectionReason;
    application.reviewedBy = req.dbUser._id;
    application.reviewedAt = new Date();
    await application.save();

    res.status(200).json({ message: 'Application rejected.', application });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting application', error: error.message });
  }
};
