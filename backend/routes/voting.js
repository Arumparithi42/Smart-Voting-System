import express from 'express';
import { castVote, getAllElections, getElectionById, getElectionResults, verifyReceipt, getMyVoteStatus } from '../controllers/votingController.js';
import { checkAdminStatus } from '../controllers/userController.js';
import { requireAuth, requireVoterVerified } from '../middleware/auth.js';

const router = express.Router();

router.get('/elections', getAllElections);

router.get('/elections/:id', getElectionById);

// requireAuth verifies the Clerk session and sets req.clerkId - castVote no
// longer trusts a clerkId supplied in the request body (previously anyone
// could vote as/for any clerkId just by putting it in the POST body).
// requireVoterVerified additionally requires (for non-admins) a completed
// voter-registry + phone-OTP verification - see middleware/auth.js.
router.post('/elections/:electionId/candidates/:candidateId/vote', requireAuth, requireVoterVerified, castVote);

// Lets the signed-in user check (and re-view) their own vote status/receipt
// for an election, before rendering the ballot.
router.get('/elections/:electionId/my-vote-status', requireAuth, getMyVoteStatus);

router.get('/elections/:electionId/results', getElectionResults);

// Requires auth (not open to anonymous callers) mainly to discourage
// unauthenticated mass-scanning/brute-forcing of receipt IDs; the receipt
// itself never reveals who a receipt belongs to or which candidate was
// chosen, only whether it matches a recorded vote.
router.post('/verify-receipt', requireAuth, verifyReceipt);

router.post('/check-admin', requireAuth, checkAdminStatus);

export default router;
