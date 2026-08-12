import express from 'express';
import { 
  createElection, 
  deleteElection, 
  addCandidateToElection, 
  removeCandidateFromElection, 
  startElection, 
  endElection 
} from '../controllers/adminController.js';

const router = express.Router();

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

export default router;
