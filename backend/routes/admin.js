import express from 'express';
import { 
  createElection, 
  deleteElection, 
  addCandidateToElection, 
  removeCandidateFromElection, 
  startElection, 
  endElection,
  scheduleElection,
  getDashboardSummary,
  setHomeVisibility,
  getUsers,
  updateUserRole,
  getApplications,
  getAdminApplicationById,
  approveApplication,
  rejectApplication
} from '../controllers/adminController.js';
import { getLiveResults } from '../controllers/votingController.js';
import {
  getProposals,
  getProposalById,
  approveProposal,
  rejectProposal,
  requestProposalRevision,
} from '../controllers/proposalController.js';
import {
  getComplaints,
  getComplaintById,
  updateComplaint,
} from '../controllers/complaintController.js';
import {
  getMonitoredElections,
  getFinalResultsForReview,
  publishResults,
  getResultEmailStatus,
  retryResultEmails,
  getFailedResultEmails,
} from '../controllers/resultPublicationController.js';
import { getAllFeedback, updateFeedback } from '../controllers/feedbackController.js';
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
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Every route below previously had no auth check at all - anyone who found
// the URL could create/delete elections or start/end voting. requireAdmin
// verifies the caller's Clerk session AND that their User record has
// role === 'admin' before any of these handlers run.
router.use(requireAdmin);

// Create an election
router.post('/elections', createElection);

// Delete an election
router.delete('/elections/:electionId', deleteElection);

// Add a candidate to an election
router.post('/elections/:electionId/candidates', addCandidateToElection);

// Remove a candidate from an election
router.delete('/elections/:electionId/candidates/:candidateId', removeCandidateFromElection);

// Start an election
router.put('/elections/:electionId/start', startElection);

// End an election
router.put('/elections/:electionId/end', endElection);

// Dashboard card counts
router.get('/dashboard-summary', getDashboardSummary);

// Show / hide an election on the home page
router.put('/elections/:electionId/home-visibility', setHomeVisibility);

// Candidate documents / manifestos and the election manifest (PDF or images).
router.post(
  '/elections/:electionId/candidates/:candidateId/documents',
  acceptUpload({ field: 'documents', maxFiles: MAX_DOCUMENTS_PER_UPLOAD, maxBytes: DOCUMENT_MAX_BYTES }),
  uploadCandidateDocuments
);
router.delete('/elections/:electionId/candidates/:candidateId/documents/:fileId', deleteCandidateDocument);
router.post('/elections/:electionId/manifest', acceptUpload({ field: 'manifest', maxBytes: MANIFEST_MAX_BYTES }), uploadElectionManifest);
router.delete('/elections/:electionId/manifest', deleteElectionManifest);

// Schedule a draft election (DRAFT -> UPCOMING)
router.put('/elections/:electionId/schedule', scheduleElection);

// Monitoring overview (status + turnout, incl. drafts)
router.get('/elections-overview', getMonitoredElections);

// --- Result publication (admin is the only publishing authority) ---
// Review final aggregate results (after voting has closed)
router.get('/elections/:electionId/final-results', getFinalResultsForReview);
// Officially publish -> public results + result emails to voters who voted
router.post('/elections/:electionId/publish-results', publishResults);
// Result email delivery status / retry failed deliveries
router.get('/elections/:electionId/result-emails', getResultEmailStatus);
router.post('/elections/:electionId/result-emails/retry', retryResultEmails);
// All failed result-email deliveries across elections
router.get('/result-emails/failed', getFailedResultEmails);

// --- Election proposals from Election Officers ---
router.get('/proposals', getProposals);
router.get('/proposals/:proposalId', getProposalById);
router.post('/proposals/:proposalId/approve', approveProposal);
router.post('/proposals/:proposalId/reject', rejectProposal);
router.post('/proposals/:proposalId/request-revision', requestProposalRevision);

// --- Voter complaints / compliance issues (admin-only) ---
router.get('/complaints', getComplaints);
router.get('/complaints/:complaintId', getComplaintById);
router.put('/complaints/:complaintId', updateComplaint);

// --- User feedback ---
router.get('/feedback', getAllFeedback);
router.put('/feedback/:feedbackId', updateFeedback);

// --- Users / Election Officer appointment ---
router.get('/users', getUsers);
router.put('/users/:userId/role', updateUserRole);

// Live vote tallies for an election that hasn't closed yet - admin only.
// (Public results stay locked until status === 'completed', see
// getElectionResults - showing running totals publicly mid-election can
// bias turnout.)
router.get('/elections/:electionId/live-results', getLiveResults);

// Candidate Registration Application Admin Operations
router.get('/candidate-applications', getApplications);
router.get('/candidate-applications/:applicationId', getAdminApplicationById);
router.post('/candidate-applications/:applicationId/approve', approveApplication);
router.post('/candidate-applications/:applicationId/reject', rejectApplication);

export default router;
