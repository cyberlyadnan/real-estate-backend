import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getLeads,
  getLead,
  updateLead,
  deleteLead,
  addFollowUp,
  completeFollowUp,
  getFollowUpAlerts,
  getLeadStats,
  sendDueFollowUpReminders,
} from '../controllers/leadController';

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', getLeadStats);
router.get('/alerts', getFollowUpAlerts);
router.post('/remind', sendDueFollowUpReminders);
router.get('/', getLeads);
router.get('/:id', getLead);
router.patch('/:id', updateLead);
router.delete('/:id', deleteLead);
router.post('/:id/follow-ups', addFollowUp);
router.patch('/:id/follow-ups/:followUpId/complete', completeFollowUp);

export default router;
