import express from 'express';
import { castVote, getAllElections, getElectionById, getElectionResults } from '../controllers/votingController.js';
import { checkAdminStatus } from '../controllers/userController.js';

const router= express.Router();

router.get('/elections',getAllElections);

router.get('/elections/:id',getElectionById);

router.post('/elections/:electionId/candidates/:candidateId/vote', castVote);

router.get('/elections/:electionId/results', getElectionResults);

router.post('/check-admin', checkAdminStatus);

export default router;