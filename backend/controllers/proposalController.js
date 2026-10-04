import mongoose from 'mongoose';
import ElectionProposal from '../models/ElectionProposal.js';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';

const MAX_CANDIDATES = 50;

const str = (value, max = 5000) => (typeof value === 'string' ? value.trim().slice(0, max) : undefined);

// Only these fields are ever read from a client body for a candidate -
// in particular a client can never supply `votes`.
const sanitizeCandidates = (candidates) => {
  if (candidates === undefined) return undefined;
  if (!Array.isArray(candidates)) return null;
  return candidates
    .slice(0, MAX_CANDIDATES)
    .map((c) => ({
      name: str(c?.name, 200),
      partyName: str(c?.partyName, 200),
      about: str(c?.about, 2000),
    }))
    .filter((c) => c.name);
};

const parseWindow = (startValue, endValue) => {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (!startValue || !endValue || isNaN(start) || isNaN(end)) {
    return { error: 'Valid start and end date/times are required' };
  }
  if (end <= start) {
    return { error: 'End time must be strictly after start time' };
  }
  if (end <= new Date()) {
    return { error: 'End time must be in the future' };
  }
  return { start, end };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ======================= ELECTION OFFICER =======================

// "Propose New Election". Creates a proposal for admin review - never an
// Election document.
export const createProposal = async (req, res) => {
  try {
    const title = str(req.body.title, 200);
    const description = str(req.body.description);
    if (!title || !description) {
      return res.status(400).json({ message: 'Election name and description are required' });
    }

    const window = parseWindow(req.body.proposedStartTime, req.body.proposedEndTime);
    if (window.error) return res.status(400).json({ message: window.error });

    const candidates = sanitizeCandidates(req.body.candidates);
    if (candidates === null) return res.status(400).json({ message: 'candidates must be a list' });

    // status/reviewedBy/createdElection etc. are never read from the body.
    const proposal = await ElectionProposal.create({
      title,
      description,
      purpose: str(req.body.purpose),
      category: str(req.body.category, 100),
      proposedStartTime: window.start,
      proposedEndTime: window.end,
      candidates: candidates || [],
      officerNotes: str(req.body.officerNotes),
      proposedBy: req.dbUser._id,
      status: 'PENDING',
    });

    res.status(201).json({ message: 'Election proposal submitted to Admin.', proposal });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting proposal', error: error.message });
  }
};

// An officer only ever sees their own proposals.
export const getMyProposals = async (req, res) => {
  try {
    const proposals = await ElectionProposal.find({ proposedBy: req.dbUser._id })
      .populate('createdElection', 'title status startTime endTime')
      .sort({ createdAt: -1 });
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching proposals', error: error.message });
  }
};

export const getMyProposalById = async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isValidId(proposalId)) return res.status(404).json({ message: 'Proposal not found' });

    const proposal = await ElectionProposal.findOne({ _id: proposalId, proposedBy: req.dbUser._id })
      .populate('createdElection', 'title status startTime endTime');
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    res.status(200).json(proposal);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching proposal', error: error.message });
  }
};

// Edit a PENDING proposal, or revise + resubmit one an admin sent back
// (REVISION_REQUESTED -> PENDING). Approved/rejected proposals are final.
export const updateMyProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isValidId(proposalId)) return res.status(404).json({ message: 'Proposal not found' });

    const proposal = await ElectionProposal.findOne({ _id: proposalId, proposedBy: req.dbUser._id });
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    if (!['PENDING', 'REVISION_REQUESTED'].includes(proposal.status)) {
      return res.status(409).json({ message: `This proposal has already been ${proposal.status.toLowerCase()} and can no longer be edited.` });
    }

    const update = {};
    for (const [field, max] of [['title', 200], ['description', 5000], ['purpose', 5000], ['category', 100], ['officerNotes', 5000]]) {
      if (req.body[field] !== undefined) update[field] = str(req.body[field], max);
    }
    if (update.title === '' || update.description === '') {
      return res.status(400).json({ message: 'Election name and description cannot be empty' });
    }

    const window = parseWindow(
      req.body.proposedStartTime ?? proposal.proposedStartTime,
      req.body.proposedEndTime ?? proposal.proposedEndTime
    );
    if (window.error) return res.status(400).json({ message: window.error });
    update.proposedStartTime = window.start;
    update.proposedEndTime = window.end;

    const candidates = sanitizeCandidates(req.body.candidates);
    if (candidates === null) return res.status(400).json({ message: 'candidates must be a list' });
    if (candidates) update.candidates = candidates;

    const wasRevision = proposal.status === 'REVISION_REQUESTED';
    const updated = await ElectionProposal.findOneAndUpdate(
      // Conditional on the status we checked, so an edit can't land on a
      // proposal an admin approved/rejected in the meantime.
      { _id: proposal._id, proposedBy: req.dbUser._id, status: proposal.status },
      {
        $set: { ...update, status: 'PENDING' },
        ...(wasRevision ? { $inc: { revisionCount: 1 } } : {}),
      },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(409).json({ message: 'This proposal was reviewed while you were editing it. Please reload.' });
    }

    res.status(200).json({
      message: wasRevision ? 'Revised proposal resubmitted to Admin.' : 'Proposal updated.',
      proposal: updated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating proposal', error: error.message });
  }
};

// ============================ ADMIN ============================

export const getProposals = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status).toUpperCase();
    const proposals = await ElectionProposal.find(filter)
      .populate('proposedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('createdElection', 'title status startTime endTime')
      .sort({ createdAt: -1 });
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching proposals', error: error.message });
  }
};

export const getProposalById = async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isValidId(proposalId)) return res.status(404).json({ message: 'Proposal not found' });
    const proposal = await ElectionProposal.findById(proposalId)
      .populate('proposedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('createdElection', 'title status startTime endTime');
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    res.status(200).json(proposal);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching proposal', error: error.message });
  }
};

// "Approve & Create Election". The ONLY path from a proposal to an official
// election. The admin may override title/description/dates/candidates
// before creating it. createAsDraft=true creates it as DRAFT (scheduled
// later via scheduleElection); otherwise it is created as UPCOMING.
export const approveProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isValidId(proposalId)) return res.status(404).json({ message: 'Proposal not found' });

    const proposal = await ElectionProposal.findById(proposalId);
    if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
    if (proposal.status !== 'PENDING') {
      return res.status(409).json({ message: `Only pending proposals can be approved (this one is ${proposal.status}).` });
    }

    const title = str(req.body.title, 200) || proposal.title;
    const description = str(req.body.description) || proposal.description;
    const window = parseWindow(
      req.body.startTime ?? proposal.proposedStartTime,
      req.body.endTime ?? proposal.proposedEndTime
    );
    if (window.error) return res.status(400).json({ message: window.error });

    const overrideCandidates = sanitizeCandidates(req.body.candidates);
    if (overrideCandidates === null) return res.status(400).json({ message: 'candidates must be a list' });
    const candidateData = overrideCandidates ?? proposal.candidates.map((c) => ({ name: c.name, partyName: c.partyName, about: c.about }));

    // Claim the proposal atomically. Conditional on updatedAt too, so an
    // officer edit that landed after we read it makes this fail instead of
    // approving stale details. Two concurrent approvals: only one wins.
    const claimed = await ElectionProposal.findOneAndUpdate(
      { _id: proposal._id, status: 'PENDING', updatedAt: proposal.updatedAt },
      {
        $set: {
          status: 'APPROVED',
          reviewedBy: req.dbUser._id,
          reviewedAt: new Date(),
          adminFeedback: str(req.body.adminFeedback) || undefined,
        },
      },
      { new: true }
    );
    if (!claimed) {
      return res.status(409).json({ message: 'This proposal changed or was already reviewed. Please reload and try again.' });
    }

    let createdCandidates = [];
    try {
      createdCandidates = candidateData.length
        ? await Candidate.insertMany(candidateData.map((c) => ({ ...c, votes: 0 })))
        : [];

      const election = await Election.create({
        title,
        description,
        purpose: proposal.purpose,
        category: proposal.category,
        status: req.body.createAsDraft ? 'draft' : 'upcoming',
        startTime: window.start,
        endTime: window.end,
        candidates: createdCandidates.map((c) => c._id),
        voters: [],
        proposalId: proposal._id,
        createdBy: req.dbUser._id,
      });

      claimed.createdElection = election._id;
      await claimed.save();

      res.status(201).json({ message: 'Proposal approved and official election created.', proposal: claimed, election });
    } catch (error) {
      // Undo so the proposal can be approved again - never leave an
      // APPROVED proposal without its election.
      if (createdCandidates.length) {
        await Candidate.deleteMany({ _id: { $in: createdCandidates.map((c) => c._id) } }).catch(() => {});
      }
      await ElectionProposal.updateOne(
        { _id: proposal._id, status: 'APPROVED', createdElection: { $exists: false } },
        { $set: { status: 'PENDING' }, $unset: { reviewedBy: '', reviewedAt: '', adminFeedback: '' } }
      ).catch(() => {});
      throw error;
    }
  } catch (error) {
    res.status(500).json({ message: 'Error approving proposal', error: error.message });
  }
};

const reviewWithoutElection = (newStatus, successMessage, feedbackLabel) => async (req, res) => {
  try {
    const { proposalId } = req.params;
    if (!isValidId(proposalId)) return res.status(404).json({ message: 'Proposal not found' });

    const feedback = str(req.body.feedback ?? req.body.reason);
    if (!feedback) {
      return res.status(400).json({ message: `${feedbackLabel} is required.` });
    }

    const updated = await ElectionProposal.findOneAndUpdate(
      { _id: proposalId, status: 'PENDING' },
      { $set: { status: newStatus, adminFeedback: feedback, reviewedBy: req.dbUser._id, reviewedAt: new Date() } },
      { new: true }
    );
    if (!updated) {
      const exists = await ElectionProposal.exists({ _id: proposalId });
      if (!exists) return res.status(404).json({ message: 'Proposal not found' });
      return res.status(409).json({ message: 'Only pending proposals can be reviewed.' });
    }

    res.status(200).json({ message: successMessage, proposal: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing proposal', error: error.message });
  }
};

export const rejectProposal = reviewWithoutElection('REJECTED', 'Proposal rejected.', 'A reason for rejection');
export const requestProposalRevision = reviewWithoutElection('REVISION_REQUESTED', 'Revision requested from the Election Officer.', 'Revision feedback');
