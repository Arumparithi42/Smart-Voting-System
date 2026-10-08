import express from 'express';
import {
  createProposal,
  getMyProposals,
  getMyProposalById,
  updateMyProposal,
} from '../controllers/proposalController.js';
import {
  getMonitoredElections,
  getFinalResultsForReview,
  recommendPublication,
} from '../controllers/resultPublicationController.js';
import { getOfficerElection, getOfficerElectionAnalytics } from '../controllers/officerController.js';
import { addCandidateToElection, removeCandidateFromElection } from '../controllers/adminController.js';
import { getLiveResults } from '../controllers/votingController.js';
import {
  uploadCandidateDocuments,
  deleteCandidateDocument,
  uploadElectionManifest,
  deleteElectionManifest,
  DOCUMENT_MAX_BYTES,
  MANIFEST_MAX_BYTES,
  MAX_DOCUMENTS_PER_UPLOAD,
} from '../controllers/documentController.js';
import { acceptUpload } from '../middleware/upload.js';
import { requireElectionOfficer } from '../middleware/auth.js';

const router = express.Router();

// Election Officer only - role verified server-side from our User record.
// Officers may READ live aggregate tallies, but nothing here creates an
// official election, changes election status, modifies vote counts,
// publishes results, reads voter registry data
// (Aadhaar etc.) or reads complaints.
router.use(requireElectionOfficer);

// Propose elections to the admin
router.post('/proposals', createProposal);
router.get('/proposals', getMyProposals);
router.get('/proposals/:proposalId', getMyProposalById);
router.put('/proposals/:proposalId', updateMyProposal);

// Monitor approved elections (status + turnout; no live per-candidate tallies)
router.get('/elections', getMonitoredElections);
router.get('/elections/:electionId', getOfficerElection);
router.get('/elections/:electionId/analytics', getOfficerElectionAnalytics);
// Live tallies (aggregate counts) while voting is open - same data the admin sees.
router.get('/elections/:electionId/live-results', getLiveResults);

// Candidate management on approved elections - only while DRAFT/UPCOMING
// (the handlers refuse once voting has started). New candidates always
// start at 0 votes; no route lets an officer touch vote counts.
router.post('/elections/:electionId/candidates', addCandidateToElection);
router.delete('/elections/:electionId/candidates/:candidateId', removeCandidateFromElection);

// Candidate documents / manifestos and the election manifest (PDF or images).
router.post(
  '/elections/:electionId/candidates/:candidateId/documents',
  acceptUpload({ field: 'documents', maxFiles: MAX_DOCUMENTS_PER_UPLOAD, maxBytes: DOCUMENT_MAX_BYTES }),
  uploadCandidateDocuments
);
router.delete('/elections/:electionId/candidates/:candidateId/documents/:fileId', deleteCandidateDocument);
router.post('/elections/:electionId/manifest', acceptUpload({ field: 'manifest', maxBytes: MANIFEST_MAX_BYTES }), uploadElectionManifest);
router.delete('/elections/:electionId/manifest', deleteElectionManifest);

// Review final aggregate results once voting has closed
router.get('/elections/:electionId/final-results', getFinalResultsForReview);
// Advise the admin that results are ready to publish
router.post('/elections/:electionId/recommend-publication', recommendPublication);

export default router;
