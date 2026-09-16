import CandidateApplication from '../models/CandidateApplication.js';
import Election from '../models/Election.js';
import { getEffectiveElectionStatus } from '../utils/electionStatus.js';

// Get candidate applications for the authenticated user
export const getMyApplications = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const applications = await CandidateApplication.find({ clerkId }).populate('electionId', 'title status startTime endTime');
    res.status(200).json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications', error: error.message });
  }
};

// Create a new candidate application
export const createApplication = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const { electionId, fullName, email, phone, dateOfBirth, address, profilePhotoUrl, partyName, partySymbolUrl, qualification, occupation, about, manifesto, promises } = req.body;

    const election = await Election.findById(electionId);
    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    if (getEffectiveElectionStatus(election) !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot apply: the election has already started or ended.' });
    }

    // Check duplicate
    const existing = await CandidateApplication.findOne({ electionId, clerkId });
    if (existing) {
      if (existing.status === 'rejected') {
        // Can optionally overwrite the existing rejected application, but here we explicitly block duplicate creation or we update.
        // Let's perform an in-place update for resubmission.
        existing.status = 'pending';
        existing.fullName = fullName;
        existing.email = email;
        existing.phone = phone;
        existing.dateOfBirth = dateOfBirth;
        existing.address = address;
        existing.profilePhotoUrl = profilePhotoUrl;
        existing.partyName = partyName;
        existing.partySymbolUrl = partySymbolUrl;
        existing.qualification = qualification;
        existing.occupation = occupation;
        existing.about = about;
        existing.manifesto = manifesto;
        existing.promises = promises;
        existing.rejectionReason = undefined; 
        await existing.save();
        return res.status(200).json({ message: 'Application resubmitted successfully', application: existing });
      } else {
        return res.status(400).json({ message: 'You have already submitted an application for this election.' });
      }
    }

    const newApplication = new CandidateApplication({
      electionId,
      clerkId,
      fullName,
      email,
      phone,
      dateOfBirth,
      address,
      profilePhotoUrl,
      partyName,
      partySymbolUrl,
      qualification,
      occupation,
      about,
      manifesto,
      promises,
      status: 'pending' // Enforce pending
    });

    await newApplication.save();
    res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting application', error: error.message });
  }
};

// Edit an existing application
export const editApplication = async (req, res) => {
  try {
    const clerkId = req.clerkId;
    const { id } = req.params;
    const updateData = req.body;

    const application = await CandidateApplication.findById(id);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    if (application.clerkId !== clerkId) {
      return res.status(403).json({ message: 'You do not have permission to edit this application.' });
    }

    if (application.status === 'approved') {
      return res.status(400).json({ message: 'Cannot edit an approved application.' });
    }

    const election = await Election.findById(application.electionId);
    if (getEffectiveElectionStatus(election) !== 'upcoming') {
      return res.status(400).json({ message: 'Cannot edit: the election has already started.' });
    }

    // Only allow editable fields
    const editableFields = ['fullName', 'email', 'phone', 'dateOfBirth', 'address', 'profilePhotoUrl', 'partyName', 'partySymbolUrl', 'qualification', 'occupation', 'about', 'manifesto', 'promises'];
    editableFields.forEach(field => {
      if (updateData[field] !== undefined) {
        application[field] = updateData[field];
      }
    });

    // If it was rejected, editing implicitly moves it back to pending
    if (application.status === 'rejected') {
      application.status = 'pending';
      application.rejectionReason = undefined;
    }

    await application.save();
    res.status(200).json({ message: 'Application updated', application });
  } catch (error) {
    res.status(500).json({ message: 'Error editing application', error: error.message });
  }
};

// Get specific application
export const getApplicationById = async (req, res) => {
  try {
     const clerkId = req.clerkId;
     const { id } = req.params;
     const application = await CandidateApplication.findById(id).populate('electionId', 'title status startTime endTime');
     
     if (!application) return res.status(404).json({ message: 'Application not found' });
     if (application.clerkId !== clerkId) {
        // We only allow the owner to see it mapped this way directly. Admins have their own endpoints.
        return res.status(403).json({ message: 'Unauthorized' });
     }
     res.status(200).json(application);
  } catch (error) {
     res.status(500).json({ message: 'Server error', error: error.message });
  }
};
