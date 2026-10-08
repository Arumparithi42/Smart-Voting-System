import Election from '../models/Election.js'; 
import Candidate from '../models/Candidate.js';
import CandidateApplication from '../models/CandidateApplication.js';
import User from '../models/User.js';
import { sanitizeCandidates } from './proposalController.js';
import ElectionProposal from '../models/ElectionProposal.js';
import Complaint from '../models/Complaint.js';
import Feedback from '../models/Feedback.js';
import ResultEmailDelivery from '../models/ResultEmailDelivery.js';
import { getElectionLifecycleStage } from '../utils/electionStatus.js';
import { sendBookingConfirmationEmail } from './sendEmail.js';
import { getEffectiveElectionStatus } from '../utils/electionStatus.js';


// Create an election
export const createElection = async (req, res) => {
  try {
    const { title, description, purpose, category, startTime, endTime } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'Election title is required' });
    }
    // Candidates entered in the same form - only name/party/about are read,
    // so a candidate can never be created with votes.
    const candidateData = sanitizeCandidates(req.body.candidates);
    if (candidateData === null) {
      return res.status(400).json({ message: 'candidates must be a list' });
    }
    
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

    const createdCandidates = candidateData?.length
      ? await Candidate.insertMany(candidateData.map((c) => ({ ...c, votes: 0 })))
      : [];

    const newElection = new Election({
      title: title.trim(),
      description,
      purpose,
      category,
      showOnHomePage: req.body.showOnHomePage === true || req.body.showOnHomePage === 'true',
      createdBy: req.dbUser._id,
      status: 'upcoming',
      startTime: start,
      endTime: end,
      candidates: createdCandidates.map((c) => c._id),
      voters: []
    });
    try {
      await newElection.save();
    } catch (error) {
      if (createdCandidates.length) await Candidate.deleteMany({ _id: { $in: createdCandidates.map((c) => c._id) } }).catch(() => {});
      throw error;
    }
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
    if (!['draft', 'upcoming'].includes(effectiveStatus)) {
      return res.status(400).json({ message: 'Cannot delete an election after it has started.' });
    }

    await Election.findByIdAndDelete(electionId);
    res.status(200).json({ message: 'Election deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting election', error: error.message });
  }
};

// Add candidate to an election (admins, and officers via routes/officer.js).
// Only before voting starts; only name/party/about are read from the body,
// so a candidate can never be created with a vote count.
export const addCandidateToElection = async (req, res) => {
    try {
      const { electionId } = req.params;
      const name = typeof req.body.name === 'string' ? req.body.name.trim().slice(0, 200) : '';
      const partyName = typeof req.body.partyName === 'string' ? req.body.partyName.trim().slice(0, 200) : undefined;
      const aboutInput = req.body.about ?? req.body.description;
      const about = typeof aboutInput === 'string' ? aboutInput.trim().slice(0, 2000) : undefined;
      if (!name) return res.status(400).json({ message: 'Candidate name is required' });

      // Check the election BEFORE creating anything, so a rejected request
      // never leaves an orphaned candidate behind.
      const election = await Election.findById(electionId);
      if (!election) return res.status(404).json({ message: 'Election not found' });

      const effectiveStatus = getEffectiveElectionStatus(election);
      if (!['draft', 'upcoming'].includes(effectiveStatus)) {
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }

      const newCandidate = await Candidate.create({ name, partyName, about, votes: 0 });

      // Conditional push: re-checks "not started" atomically.
      const updated = await Election.findOneAndUpdate(
        {
          _id: electionId,
          $or: [
            { status: 'draft' },
            { startTime: { $gt: new Date() } },
            { startTime: { $exists: false }, status: 'upcoming' }, // legacy elections without times
          ],
        },
        { $push: { candidates: newCandidate._id } },
        { new: true }
      );
      if (!updated) {
        await Candidate.deleteOne({ _id: newCandidate._id });
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }

      res.status(200).json({ message: 'Candidate created and added to election', election: updated, candidate: newCandidate });
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
      if (!['draft', 'upcoming'].includes(effectiveStatus)) {
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }

      // Step 2: Remove candidate - conditional on voting still not having
      // started, so a removal can never land mid-election.
      const updated = await Election.findOneAndUpdate(
        {
          _id: electionId,
          $or: [
            { status: 'draft' },
            { startTime: { $gt: new Date() } },
            { startTime: { $exists: false }, status: 'upcoming' },
          ],
        },
        { $pull: { candidates: candidateId } },
        { new: true }
      );
      if (!updated) {
        return res.status(400).json({ message: 'Candidates cannot be modified after the election has started.' });
      }
  
      res.status(200).json({ message: 'Candidate removed from election', election: updated });
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


// Schedule a DRAFT election (e.g. one created from a proposal with
// createAsDraft): DRAFT -> UPCOMING. From then on its start/end times drive
// UPCOMING -> ONGOING -> ENDED automatically.
export const scheduleElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    const election = await Election.findById(electionId);
    if (!election) return res.status(404).json({ message: 'Election not found' });

    if (election.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft elections can be scheduled.' });
    }
    if (!election.startTime || !election.endTime || election.endTime <= new Date()) {
      return res.status(400).json({ message: 'This draft has no valid future end time. Recreate it with valid dates.' });
    }

    const updated = await Election.findOneAndUpdate(
      { _id: electionId, status: 'draft' },
      { $set: { status: 'upcoming' } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ message: 'Election was already scheduled.' });

    res.status(200).json({ message: 'Election scheduled', election: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error scheduling election', error: error.message });
  }
};


// Admin's "Show on home page" Yes/No for an existing election.
export const setHomeVisibility = async (req, res) => {
  try {
    const { electionId } = req.params;
    if (typeof req.body.showOnHomePage !== 'boolean') {
      return res.status(400).json({ message: 'showOnHomePage must be true or false' });
    }
    const election = await Election.findByIdAndUpdate(
      electionId,
      { $set: { showOnHomePage: req.body.showOnHomePage } },
      { new: true }
    ).select('title showOnHomePage');
    if (!election) return res.status(404).json({ message: 'Election not found' });
    res.status(200).json({
      message: election.showOnHomePage ? 'Election will be shown on the home page.' : 'Election removed from the home page.',
      election,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating home page visibility', error: error.message });
  }
};

// Counts for the admin dashboard cards.
export const getDashboardSummary = async (req, res) => {
  try {
    const [newFeedback, pendingProposals, openComplaints, failedResultEmails, elections] = await Promise.all([
      Feedback.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } }),
      ElectionProposal.countDocuments({ status: 'PENDING' }),
      Complaint.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
      ResultEmailDelivery.countDocuments({ status: 'FAILED' }),
      Election.find().select('status startTime endTime resultsPublished'),
    ]);
    const stages = { DRAFT: 0, UPCOMING: 0, ONGOING: 0, ENDED: 0, RESULTS_PUBLISHED: 0 };
    for (const e of elections) stages[getElectionLifecycleStage(e)] += 1;

    res.status(200).json({
      pendingProposals,
      newFeedback,
      openComplaints,
      failedResultEmails,
      elections: stages,
      // Ended elections whose results still need official publication.
      resultsPending: stages.ENDED,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading dashboard summary', error: error.message });
  }
};


// ========== USER / OFFICER MANAGEMENT ==========

export const getUsers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = String(req.query.role);
    const users = await User.find(filter)
      .select('clerkId email firstName lastName role createdAt')
      .sort({ role: 1, createdAt: -1 })
      .limit(1000);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// Appoint / remove Election Officers. Deliberately limited to the
// 'user' <-> 'officer' roles: admin accounts can't be created or demoted
// through the API (that stays a direct DB operation, as before).
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!/^[a-f\d]{24}$/i.test(userId)) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!['user', 'officer'].includes(role)) {
      return res.status(400).json({ message: "Role must be 'user' or 'officer'." });
    }

    const updated = await User.findOneAndUpdate(
      { _id: userId, role: { $ne: 'admin' } },
      { $set: { role } },
      { new: true }
    ).select('clerkId email firstName lastName role');

    if (!updated) {
      const exists = await User.exists({ _id: userId });
      return exists
        ? res.status(403).json({ message: 'Admin accounts cannot be changed here.' })
        : res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: `Role updated to ${role}.`, user: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating role', error: error.message });
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
