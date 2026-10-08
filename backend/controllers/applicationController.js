import CandidateApplication from '../models/CandidateApplication.js';
import Election from '../models/Election.js';
import StoredFile from '../models/StoredFile.js';
import { getEffectiveElectionStatus } from '../utils/electionStatus.js';
import { storeValidated } from './documentController.js';
import { sendStoredFile } from '../middleware/upload.js';
import { notifyCandidateApplicationSubmitted } from '../services/notificationService.js';

const quietly = (promise) => promise.catch((error) => console.error('Notification failed:', error.message));

const MAX_PROMISES = 20;

// Manifesto and promises are optional. Multipart forms send promises as a
// JSON string; blank entries are dropped.
const parsePromises = (value) => {
  let list = value;
  if (typeof value === 'string') {
    try { list = JSON.parse(value); } catch { list = [value]; }
  }
  if (!Array.isArray(list)) return [];
  return list.filter((p) => typeof p === 'string').map((p) => p.trim()).filter(Boolean).slice(0, MAX_PROMISES);
};

// Stores the applicant's optional manifesto file (PDF / image, type checked
// from the content) and replaces any previous one. `removeManifestoFile`
// = 'true' removes it without a replacement.
const applyManifestoFile = async (application, req) => {
  const previous = application.manifestoFile?.fileId;
  if (req.file) {
    const [stored] = await storeValidated([req.file], 'application-manifesto', req.clerkId);
    application.manifestoFile = { fileId: stored._id, filename: stored.filename, contentType: stored.contentType, size: stored.size, uploadedAt: new Date() };
  } else if (String(req.body.removeManifestoFile) === 'true') {
    application.manifestoFile = undefined;
  } else {
    return null;
  }
  return previous || null;
};
const dropFile = (fileId) => fileId && StoredFile.deleteOne({ _id: fileId, kind: 'application-manifesto' }).catch(() => {});

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
    const { electionId, fullName, email, phone, dateOfBirth, address, profilePhotoUrl, partyName, partySymbolUrl, qualification, occupation, about, manifesto } = req.body;
    const promises = parsePromises(req.body.promises);

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
        const replaced = await applyManifestoFile(existing, req);
        await existing.save();
        dropFile(replaced);
        await quietly(notifyCandidateApplicationSubmitted(existing, election.title, { resubmitted: true }));
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

    await applyManifestoFile(newApplication, req);
    await newApplication.save();
    await quietly(notifyCandidateApplicationSubmitted(newApplication, election.title));
    res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error submitting application', error: error.message });
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
        application[field] = field === 'promises' ? parsePromises(updateData[field]) : updateData[field];
      }
    });
    const replaced = await applyManifestoFile(application, req);

    // If it was rejected, editing implicitly moves it back to pending
    const resubmitted = application.status === 'rejected';
    if (resubmitted) {
      application.status = 'pending';
      application.rejectionReason = undefined;
    }

    await application.save();
    dropFile(replaced);
    if (resubmitted) await quietly(notifyCandidateApplicationSubmitted(application, election.title, { resubmitted: true }));
    res.status(200).json({ message: 'Application updated', application });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.status ? error.message : 'Error editing application', error: error.message });
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

// The applicant's own manifesto file (admins use their own endpoint).
export const getMyApplicationManifesto = async (req, res) => {
  try {
    const application = await CandidateApplication.findById(req.params.id).select('clerkId manifestoFile');
    if (!application || application.clerkId !== req.clerkId || !application.manifestoFile?.fileId) {
      return res.status(404).json({ message: 'File not found' });
    }
    const file = await StoredFile.findOne({ _id: application.manifestoFile.fileId, kind: { $in: ['application-manifesto', 'candidate-document'] } });
    if (!file) return res.status(404).json({ message: 'File not found' });
    sendStoredFile(res, file);
  } catch (error) {
    res.status(error.status || 500).json({ message: 'Error loading file', error: error.message });
  }
};
