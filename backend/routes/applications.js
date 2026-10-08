import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMyApplications, createApplication, editApplication, getApplicationById, getMyApplicationManifesto } from '../controllers/applicationController.js';
import { DOCUMENT_MAX_BYTES } from '../controllers/documentController.js';
import { acceptUpload } from '../middleware/upload.js';

// Optional manifesto file; JSON requests without a file still work.
const manifestoUpload = acceptUpload({ field: 'manifestoFile', maxBytes: DOCUMENT_MAX_BYTES, maxFields: 30, maxFieldBytes: 50_000 });

const router = express.Router();

router.post('/', requireAuth, manifestoUpload, createApplication);
router.get('/my', requireAuth, getMyApplications);
router.get('/:id/manifesto-file', requireAuth, getMyApplicationManifesto);
router.get('/:id', requireAuth, getApplicationById);
router.put('/:id', requireAuth, manifestoUpload, editApplication);

export default router;
