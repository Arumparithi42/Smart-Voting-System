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
import { requireOfficer } from '../middleware/auth.js';

const router = express.Router();

// Election Officer only - role verified server-side from our User record.
// Nothing here creates an official election, changes election status,
// touches vote counts, publishes results, reads voter registry data
// (Aadhaar etc.) or reads complaints.
router.use(requireOfficer);

// Propose elections to the admin
router.post('/proposals', createProposal);
router.get('/proposals', getMyProposals);
router.get('/proposals/:proposalId', getMyProposalById);
router.put('/proposals/:proposalId', updateMyProposal);

// Monitor approved elections (status + turnout; no live per-candidate tallies)
router.get('/elections', getMonitoredElections);
// Review final aggregate results once voting has closed
router.get('/elections/:electionId/final-results', getFinalResultsForReview);
// Advise the admin that results are ready to publish
router.post('/elections/:electionId/recommend-publication', recommendPublication);

export default router;
