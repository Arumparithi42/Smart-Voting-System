import mongoose from 'mongoose';
import { getAuth } from '@clerk/express';
import Election from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import StoredFile from '../models/StoredFile.js';
import User from '../models/User.js';
import { detectFileType, IMAGE_TYPES, safeFilename, sendStoredFile } from '../middleware/upload.js';

export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const MANIFEST_MAX_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_UPLOAD = 5;
const MAX_DOCUMENTS_PER_CANDIDATE = 10;

const ALLOWED = (type) => IMAGE_TYPES.includes(type) || type === 'application/pdf';
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// Staff (admin / Election Officer) check for endpoints that are otherwise public.
const callerRole = async (req) => {
  let userId;
  try { ({ userId } = getAuth(req)); } catch { return null; }
  if (!userId) return null;
  return (await User.findOne({ clerkId: userId }).select('role'))?.role || null;
};
const isStaffRole = (role) => role === 'admin' || role === 'officer';

const storeValidated = async (files, kind, ownerClerkId) => {
  const detected = files.map((f) => detectFileType(f.buffer));
  const bad = files.find((f, i) => !detected[i] || !ALLOWED(detected[i].type));
  if (bad) {
    const error = new Error(`"${bad.originalname}" is not supported. Upload a PDF or a PNG, JPEG, GIF or WebP image.`);
    error.status = 400;
    throw error;
  }
  return Promise.all(files.map((f, i) => StoredFile.create({
    kind,
    ownerClerkId,
    filename: safeFilename(f.originalname, detected[i].ext),
    contentType: detected[i].type,
    size: f.size,
    data: f.buffer,
  })));
};

const fail = (res, error, fallback) => res.status(error.status || 500).json({ message: error.status ? error.message : fallback, error: error.message });

// ---------------- Candidate documents (admin + officer) ----------------

export const uploadCandidateDocuments = async (req, res) => {
  try {
    const { electionId, candidateId } = req.params;
    if (!isId(electionId) || !isId(candidateId)) return res.status(404).json({ message: 'Candidate not found' });
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ message: 'Please choose at least one file.' });

    const election = await Election.findOne({ _id: electionId, candidates: candidateId }).select('_id');
    if (!election) return res.status(404).json({ message: 'Candidate not found in this election' });
    const candidate = await Candidate.findById(candidateId).select('documents');
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    if ((candidate.documents?.length || 0) + files.length > MAX_DOCUMENTS_PER_CANDIDATE) {
      return res.status(400).json({ message: `A candidate can have at most ${MAX_DOCUMENTS_PER_CANDIDATE} documents.` });
    }

    const docType = String(req.body.docType || 'DOCUMENT').toUpperCase() === 'MANIFESTO' ? 'MANIFESTO' : 'DOCUMENT';
    const title = typeof req.body.title === 'string' ? req.body.title.trim().slice(0, 120) : undefined;
    const stored = await storeValidated(files, 'candidate-document', req.clerkId);
    const docs = stored.map((f) => ({ fileId: f._id, docType, title: title || undefined, filename: f.filename, contentType: f.contentType, size: f.size, uploadedAt: new Date() }));
    // Only $push documents - never touches name/votes.
    const updated = await Candidate.findByIdAndUpdate(candidateId, { $push: { documents: { $each: docs } } }, { new: true }).select('name documents');
    res.status(200).json({ message: `${docs.length} document(s) uploaded.`, candidate: updated });
  } catch (error) {
    fail(res, error, 'Error uploading documents');
  }
};

export const deleteCandidateDocument = async (req, res) => {
  try {
    const { electionId, candidateId, fileId } = req.params;
    if (![electionId, candidateId, fileId].every(isId)) return res.status(404).json({ message: 'Document not found' });
    const election = await Election.findOne({ _id: electionId, candidates: candidateId }).select('_id');
    if (!election) return res.status(404).json({ message: 'Candidate not found in this election' });
    const updated = await Candidate.findOneAndUpdate(
      { _id: candidateId, 'documents.fileId': fileId },
      { $pull: { documents: { fileId } } },
      { new: true }
    ).select('name documents');
    if (!updated) return res.status(404).json({ message: 'Document not found' });
    await StoredFile.deleteOne({ _id: fileId, kind: 'candidate-document' });
    res.status(200).json({ message: 'Document removed.', candidate: updated });
  } catch (error) {
    fail(res, error, 'Error removing document');
  }
};

// Manifestos are public once the election is visible (not a draft); other
// candidate documents are only for admins and Election Officers.
export const getCandidateDocument = async (req, res) => {
  try {
    const { fileId } = req.params;
    if (!isId(fileId)) return res.status(404).json({ message: 'File not found' });
    const candidate = await Candidate.findOne({ 'documents.fileId': fileId }).select('documents');
    const doc = candidate?.documents.find((d) => String(d.fileId) === fileId);
    if (!doc) return res.status(404).json({ message: 'File not found' });

    const election = await Election.findOne({ candidates: candidate._id }).select('status');
    const isPublic = doc.docType === 'MANIFESTO' && election && election.status !== 'draft';
    if (!isPublic && !isStaffRole(await callerRole(req))) return res.status(404).json({ message: 'File not found' });

    const file = await StoredFile.findOne({ _id: fileId, kind: 'candidate-document' });
    if (!file) return res.status(404).json({ message: 'File not found' });
    sendStoredFile(res, file);
  } catch (error) {
    fail(res, error, 'Error loading file');
  }
};

// ---------------- Election manifest (admin + officer) ----------------

export const uploadElectionManifest = async (req, res) => {
  try {
    const { electionId } = req.params;
    if (!isId(electionId)) return res.status(404).json({ message: 'Election not found' });
    if (!req.file) return res.status(400).json({ message: 'Please choose a file.' });
    const election = await Election.findById(electionId).select('manifest');
    if (!election) return res.status(404).json({ message: 'Election not found' });

    const [file] = await storeValidated([req.file], 'election-manifest', req.clerkId);
    const previous = election.manifest?.fileId;
    const manifest = { fileId: file._id, filename: file.filename, contentType: file.contentType, size: file.size, uploadedAt: new Date() };
    await Election.updateOne({ _id: electionId }, { $set: { manifest } });
    if (previous) await StoredFile.deleteOne({ _id: previous, kind: 'election-manifest' }).catch(() => {});
    res.status(200).json({ message: 'Manifest uploaded.', manifest });
  } catch (error) {
    fail(res, error, 'Error uploading manifest');
  }
};

export const deleteElectionManifest = async (req, res) => {
  try {
    const { electionId } = req.params;
    if (!isId(electionId)) return res.status(404).json({ message: 'Election not found' });
    const election = await Election.findById(electionId).select('manifest');
    if (!election?.manifest?.fileId) return res.status(404).json({ message: 'No manifest uploaded' });
    await Election.updateOne({ _id: electionId }, { $unset: { manifest: '' } });
    await StoredFile.deleteOne({ _id: election.manifest.fileId, kind: 'election-manifest' });
    res.status(200).json({ message: 'Manifest removed.' });
  } catch (error) {
    fail(res, error, 'Error removing manifest');
  }
};

// Public for visible elections; drafts only for staff.
export const getElectionManifest = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ message: 'Manifest not found' });
    const election = await Election.findById(id).select('status manifest');
    if (!election?.manifest?.fileId) return res.status(404).json({ message: 'Manifest not found' });
    if (election.status === 'draft' && !isStaffRole(await callerRole(req))) return res.status(404).json({ message: 'Manifest not found' });
    const file = await StoredFile.findOne({ _id: election.manifest.fileId, kind: 'election-manifest' });
    if (!file) return res.status(404).json({ message: 'Manifest not found' });
    sendStoredFile(res, file);
  } catch (error) {
    fail(res, error, 'Error loading manifest');
  }
};
