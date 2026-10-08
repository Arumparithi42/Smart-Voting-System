import mongoose from 'mongoose';
import Complaint, {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  COMPLAINT_FINAL_STATUSES,
} from '../models/Complaint.js';
import Election from '../models/Election.js';
import User from '../models/User.js';
import StoredFile from '../models/StoredFile.js';
import { detectFileType, IMAGE_TYPES, safeFilename, sendStoredFile } from '../middleware/upload.js';
import { nextComplaintReference } from '../utils/counter.js';
import { notifyComplaintUpdated, notifyComplaintSubmitted } from '../services/notificationService.js';

const str = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What a voter is allowed to see about their own complaint - no internal
// admin user ids.
const toVoterView = (complaint) => ({
  referenceId: complaint.referenceId,
  election: complaint.election
    ? { _id: complaint.election._id, title: complaint.election.title }
    : null,
  category: complaint.category,
  subject: complaint.subject,
  description: complaint.description,
  supportingInfo: complaint.supportingInfo,
  attachments: (complaint.attachments || []).map((a) => ({
    fileId: a.fileId, filename: a.filename, contentType: a.contentType, size: a.size,
  })),
  status: complaint.status,
  adminResponse: complaint.adminResponse,
  respondedAt: complaint.respondedAt,
  closedAt: complaint.closedAt,
  statusHistory: (complaint.statusHistory || []).map((h) => ({ status: h.status, changedAt: h.changedAt })),
  createdAt: complaint.createdAt,
  updatedAt: complaint.updatedAt,
});

// ============================ VOTER ============================

// "Raise Complaint". Goes straight to the admin queue - there is no officer
// routing at all.
export const createComplaint = async (req, res) => {
  try {
    const category = String(req.body.category || '').toUpperCase();
    const subject = str(req.body.subject, 200);
    const description = str(req.body.description, 5000);
    const supportingInfo = str(req.body.supportingInfo, 2000);

    if (!COMPLAINT_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Please choose a valid complaint category' });
    }
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    let electionId;
    if (req.body.electionId) {
      if (!mongoose.Types.ObjectId.isValid(req.body.electionId)) {
        return res.status(400).json({ message: 'Invalid election' });
      }
      // Drafts are not visible to voters, so they can't complain about one.
      const election = await Election.findOne({ _id: req.body.electionId, status: { $ne: 'draft' } }).select('_id');
      if (!election) return res.status(404).json({ message: 'Election not found' });
      electionId = election._id;
    }

    // Validate every attachment by its real content before storing anything.
    const files = req.files || [];
    const detected = [];
    for (const f of files) {
      const type = detectFileType(f.buffer);
      if (!type || !(IMAGE_TYPES.includes(type.type) || type.type === 'application/pdf')) {
        return res.status(400).json({ message: `"${f.originalname}" is not a supported file. Attach PNG, JPEG, GIF, WebP images or PDFs.` });
      }
      detected.push(type);
    }

    const stored = await Promise.all(files.map((f, i) => StoredFile.create({
      kind: 'complaint-attachment',
      ownerClerkId: req.clerkId,
      filename: safeFilename(f.originalname, detected[i].ext),
      contentType: detected[i].type,
      size: f.size,
      data: f.buffer,
    })));

    let complaint;
    try {
      const referenceId = await nextComplaintReference();
      complaint = await Complaint.create({
        referenceId,
        clerkId: req.clerkId, // from the verified session, never the body
        election: electionId,
        category,
        subject,
        description,
        supportingInfo,
        attachments: stored.map((f) => ({ fileId: f._id, filename: f.filename, contentType: f.contentType, size: f.size })),
        status: 'OPEN',
        statusHistory: [{ status: 'OPEN', changedAt: new Date() }],
      });
    } catch (error) {
      // Don't leave orphaned uploads behind if the complaint wasn't saved.
      await StoredFile.deleteMany({ _id: { $in: stored.map((f) => f._id) } }).catch(() => {});
      throw error;
    }
    await complaint.populate('election', 'title');
    await notifyComplaintSubmitted(complaint).catch((error) => console.error('Notification failed:', error.message));

    res.status(201).json({
      message: 'Your complaint has been submitted to the Admin.',
      referenceId: complaint.referenceId,
      complaint: toVoterView(complaint),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting complaint', error: error.message });
  }
};

// "My Complaints" - strictly the caller's own.
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ clerkId: req.clerkId })
      .populate('election', 'title')
      .sort({ createdAt: -1 });
    res.status(200).json(complaints.map(toVoterView));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

export const getMyComplaintByReference = async (req, res) => {
  try {
    // Filtering by clerkId too means someone else's reference ID simply
    // isn't found - it never confirms that the complaint exists.
    const complaint = await Complaint.findOne({
      referenceId: String(req.params.referenceId || '').toUpperCase(),
      clerkId: req.clerkId,
    }).populate('election', 'title');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.status(200).json(toVoterView(complaint));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaint', error: error.message });
  }
};

// ============================ ADMIN ============================

const attachComplainants = async (complaints) => {
  const clerkIds = [...new Set(complaints.map((c) => c.clerkId))];
  const users = await User.find({ clerkId: { $in: clerkIds } }).select('clerkId firstName lastName email');
  const byClerkId = new Map(users.map((u) => [u.clerkId, u]));
  return complaints.map((c) => {
    const user = byClerkId.get(c.clerkId);
    return {
      ...c.toObject(),
      complainant: user
        ? { name: [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email }
        : null,
    };
  });
};

export const getComplaints = async (req, res) => {
  try {
    const { status, electionId, category, search } = req.query;
    const filter = {};
    if (status) filter.status = String(status).toUpperCase();
    if (category) filter.category = String(category).toUpperCase();
    if (electionId) {
      if (!mongoose.Types.ObjectId.isValid(electionId)) return res.status(400).json({ message: 'Invalid election' });
      filter.election = electionId;
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(String(search).trim().slice(0, 100)), 'i');
      filter.$or = [{ referenceId: pattern }, { subject: pattern }];
    }

    const complaints = await Complaint.find(filter)
      .populate('election', 'title')
      .populate('respondedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(500);
    res.status(200).json(await attachComplainants(complaints));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

export const getComplaintById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const query = mongoose.Types.ObjectId.isValid(complaintId)
      ? { _id: complaintId }
      : { referenceId: String(complaintId).toUpperCase() };
    const complaint = await Complaint.findOne(query)
      .populate('election', 'title startTime endTime')
      .populate('respondedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    const [withComplainant] = await attachComplainants([complaint]);
    res.status(200).json(withComplainant);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaint', error: error.message });
  }
};

// Respond and/or change status. RESOLVED and REJECTED are final and need a
// response to the voter.
export const updateComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(complaintId)) return res.status(404).json({ message: 'Complaint not found' });

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (COMPLAINT_FINAL_STATUSES.includes(complaint.status)) {
      return res.status(409).json({ message: `This complaint is already ${complaint.status} and cannot be changed.` });
    }

    const status = req.body.status ? String(req.body.status).toUpperCase() : undefined;
    const adminResponse = str(req.body.adminResponse, 5000);

    if (status && !COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (!status && !adminResponse) {
      return res.status(400).json({ message: 'Provide a response and/or a new status' });
    }
    if (status && COMPLAINT_FINAL_STATUSES.includes(status) && !(adminResponse || complaint.adminResponse)) {
      return res.status(400).json({ message: 'Please write a response to the voter before resolving or rejecting.' });
    }

    const now = new Date();
    const set = {};
    const push = {};
    if (adminResponse) {
      set.adminResponse = adminResponse;
      set.respondedBy = req.dbUser._id;
      set.respondedAt = now;
    }
    if (status && status !== complaint.status) {
      set.status = status;
      push.statusHistory = { status, changedBy: req.dbUser._id, changedAt: now };
      if (COMPLAINT_FINAL_STATUSES.includes(status)) set.closedAt = now;
    }

    const updated = await Complaint.findOneAndUpdate(
      // Re-check "not final" atomically so two admins can't both close it.
      { _id: complaint._id, status: { $nin: COMPLAINT_FINAL_STATUSES } },
      { $set: set, ...(Object.keys(push).length ? { $push: push } : {}) },
      { new: true }
    ).populate('election', 'title');
    if (!updated) {
      return res.status(409).json({ message: 'This complaint was closed by another admin. Please reload.' });
    }

    // Tell the complainant (only them) that their complaint changed.
    await notifyComplaintUpdated(updated).catch((error) => {
      console.error(`Complaint notification failed for ${updated.referenceId}:`, error.message);
    });

    const [withComplainant] = await attachComplainants([updated]);
    res.status(200).json({ message: 'Complaint updated.', complaint: withComplainant });
  } catch (error) {
    res.status(500).json({ message: 'Error updating complaint', error: error.message });
  }
};

export const COMPLAINT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const COMPLAINT_MAX_ATTACHMENTS = 3;

// Download one attachment. Only the complainant who uploaded it, or an
// admin, may read it - Election Officers and other voters get 404.
export const getComplaintAttachment = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(fileId)) return res.status(404).json({ message: 'File not found' });
    const file = await StoredFile.findOne({ _id: fileId, kind: 'complaint-attachment' });
    if (!file) return res.status(404).json({ message: 'File not found' });

    if (file.ownerClerkId !== req.clerkId) {
      const user = await User.findOne({ clerkId: req.clerkId }).select('role');
      if (user?.role !== 'admin') return res.status(404).json({ message: 'File not found' });
    }
    sendStoredFile(res, file);
  } catch (error) {
    res.status(500).json({ message: 'Error loading file', error: error.message });
  }
};
