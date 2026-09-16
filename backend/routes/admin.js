import express from 'express';
import { 
  createElection, 
  deleteElection, 
  addCandidateToElection, 
  removeCandidateFromElection, 
  startElection, 
  endElection,
  getApplications,
  getAdminApplicationById,
  approveApplication,
  rejectApplication
} from '../controllers/adminController.js';
import { getLiveResults } from '../controllers/votingController.js';
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
