import { Request, Response } from 'express';
import { subDays } from 'date-fns';
import Lead from '../models/Lead';
import LeadFollowUp from '../models/LeadFollowUp';
import { Types } from 'mongoose';
import { sendFollowUpReminderEmail, sendFollowUpDueAlertToAdmins } from '../utils/email';
import { getAdminEmails, createNotificationsForAdmins } from '../utils/adminAlerts';
import type { LeadStatus, LeadPriority } from '../models/Lead';
import type { FollowUpType } from '../models/LeadFollowUp';

/** Create lead (admin). */
export const createLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, message, source, propertyId, propertySlug, propertyName, budget, budgetMax, preferredArea, address } = req.body;
    if (!name || !email || !phone) {
      res.status(400).json({ success: false, message: 'Name, email and phone are required' });
      return;
    }
    const sourceVal = ['contact_page', 'lead_form', 'property_detail', 'mobile_app', 'whatsapp', 'other'].includes(source) ? source : 'lead_form';
    const lead = await Lead.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone).trim(),
      message: message ? String(message).trim() : 'Manual lead from admin',
      source: sourceVal,
      propertyId: propertyId && Types.ObjectId.isValid(propertyId) ? new Types.ObjectId(propertyId) : undefined,
      propertySlug: propertySlug ? String(propertySlug).trim() : undefined,
      propertyName: propertyName ? String(propertyName).trim() : undefined,
      budget: budget ? Number(budget) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
      preferredArea: preferredArea ? String(preferredArea).trim() : undefined,
      address: address ? String(address).trim() : undefined,
    });
    const populated = await Lead.findById(lead._id).populate('assignedTo', 'name email').populate('propertyId', 'name slug').lean();
    res.status(201).json({ success: true, data: populated, message: 'Lead created successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to create lead',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Get all leads – filters, search, pagination, sort. */
export const getLeads = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const status = req.query.status as string | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const overdueOnly = req.query.overdue === 'true';

    const filter: Record<string, unknown> = {};
    if (status && ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurturing'].includes(status)) {
      filter.status = status;
    }
    if (assignedTo !== undefined && assignedTo !== '') {
      if (assignedTo === 'unassigned') {
        filter.$or = [{ assignedTo: null }, { assignedTo: { $exists: false } }];
      } else if (Types.ObjectId.isValid(assignedTo)) {
        filter.assignedTo = new Types.ObjectId(assignedTo);
      }
    }
    if (overdueOnly) {
      filter.nextFollowUpAt = { $lte: new Date(), $ne: null };
    }
    if (search) {
      const searchOr = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { propertyName: { $regex: search, $options: 'i' } },
        { propertySlug: { $regex: search, $options: 'i' } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
        delete filter.$or;
      } else {
        filter.$or = searchOr;
      }
    }

    const sort: Record<string, 1 | -1> = {};
    if (['name', 'email', 'status', 'priority', 'createdAt', 'updatedAt', 'nextFollowUpAt'].includes(sortBy)) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter).sort(sort).skip(skip).limit(limit).populate('assignedTo', 'name email').populate('propertyId', 'name slug').lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Get single lead by ID with follow-ups. */
export const getLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }
    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email')
      .populate('propertyId', 'name slug location price')
      .lean();
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }
    const followUps = await LeadFollowUp.find({ leadId: id })
      .sort({ dueAt: 1 })
      .populate('completedBy', 'name')
      .lean();
    res.json({ success: true, data: { ...lead, followUps } });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Update lead – status, notes, assignedTo, priority, nextFollowUpAt. */
export const updateLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }
    const { status, notes, assignedTo, priority, nextFollowUpAt, budget, budgetMax, preferredArea, address, lastContactMode, contactHistory } = req.body;
    const update: Record<string, unknown> = {};
    if (status && ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurturing'].includes(status)) {
      update.status = status as LeadStatus;
    }
    if (notes !== undefined) update.notes = String(notes).trim();
    if (assignedTo !== undefined) {
      update.assignedTo = assignedTo && Types.ObjectId.isValid(assignedTo) ? new Types.ObjectId(assignedTo) : null;
    }
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      update.priority = priority as LeadPriority;
    }
    if (nextFollowUpAt !== undefined) {
      update.nextFollowUpAt = nextFollowUpAt ? new Date(nextFollowUpAt) : null;
    }
    if (budget !== undefined) update.budget = budget ? Number(budget) : null;
    if (budgetMax !== undefined) update.budgetMax = budgetMax ? Number(budgetMax) : null;
    if (preferredArea !== undefined) update.preferredArea = preferredArea ? String(preferredArea).trim() : null;
    if (address !== undefined) update.address = address ? String(address).trim() : null;
    if (lastContactMode && ['call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other'].includes(lastContactMode)) {
      update.lastContactMode = lastContactMode;
    }
    if (contactHistory !== undefined) update.contactHistory = contactHistory ? String(contactHistory).trim() : null;

    const lead = await Lead.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('assignedTo', 'name email')
      .populate('propertyId', 'name slug')
      .lean();

    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }
    res.json({ success: true, data: lead, message: 'Lead updated successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update lead',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Delete lead (and its follow-ups). */
export const deleteLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }
    const lead = await Lead.findByIdAndDelete(id);
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }
    await LeadFollowUp.deleteMany({ leadId: id });
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete lead',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Add follow-up to a lead. */
export const addFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!leadId || !Types.ObjectId.isValid(leadId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID' });
      return;
    }
    const { dueAt, type, title, notes } = req.body;
    if (!dueAt || !title) {
      res.status(400).json({ success: false, message: 'dueAt and title are required' });
      return;
    }
    const lead = await Lead.findById(leadId);
    if (!lead) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }
    const typeVal = (['call', 'email', 'meeting', 'whatsapp', 'site_visit', 'document', 'other'].includes(type) ? type : 'call') as FollowUpType;
    const followUp = await LeadFollowUp.create({
      leadId: new Types.ObjectId(leadId),
      dueAt: new Date(dueAt),
      type: typeVal,
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : undefined,
    });
    // Update lead's nextFollowUpAt if this is the next or only upcoming follow-up
    const nextUp = await LeadFollowUp.findOne({ leadId, completedAt: null }).sort({ dueAt: 1 });
    if (nextUp) {
      await Lead.findByIdAndUpdate(leadId, { $set: { nextFollowUpAt: nextUp.dueAt } });
    }
    const populated = await LeadFollowUp.findById(followUp._id).lean();
    res.status(201).json({ success: true, data: populated, message: 'Follow-up added' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to add follow-up',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Complete a follow-up. */
export const completeFollowUp = async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const followUpId = Array.isArray(req.params.followUpId) ? req.params.followUpId[0] : req.params.followUpId;
    if (!leadId || !Types.ObjectId.isValid(leadId) || !followUpId || !Types.ObjectId.isValid(followUpId)) {
      res.status(400).json({ success: false, message: 'Invalid lead ID or follow-up ID' });
      return;
    }
    const userId = (req as any).user?._id;
    const followUp = await LeadFollowUp.findOneAndUpdate(
      { _id: followUpId, leadId },
      { $set: { completedAt: new Date(), completedBy: userId } },
      { new: true }
    ).populate('completedBy', 'name').lean();
    if (!followUp) {
      res.status(404).json({ success: false, message: 'Follow-up not found' });
      return;
    }
    // Recompute lead nextFollowUpAt from next incomplete follow-up
    const nextUp = await LeadFollowUp.findOne({ leadId, completedAt: null }).sort({ dueAt: 1 });
    await Lead.findByIdAndUpdate(leadId, { $set: { nextFollowUpAt: nextUp ? nextUp.dueAt : null } });
    res.json({ success: true, data: followUp, message: 'Follow-up completed' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete follow-up',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Get overdue and upcoming follow-ups (for alerts). */
export const getFollowUpAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const assignedTo = req.query.assignedTo as string | undefined;
    const filter: Record<string, unknown> = { completedAt: null };
    if (assignedTo && Types.ObjectId.isValid(assignedTo)) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const leads = await Lead.find({
      ...filter,
      nextFollowUpAt: { $lte: in24h, $ne: null },
    })
      .sort({ nextFollowUpAt: 1 })
      .populate('assignedTo', 'name email')
      .lean();
    const overdue = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < now);
    const upcoming = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= now);
    const followUpsDue = await LeadFollowUp.find({
      completedAt: null,
      dueAt: { $lte: in24h },
    })
      .sort({ dueAt: 1 })
      .populate('leadId')
      .lean();
    res.json({
      success: true,
      data: {
        overdueLeads: overdue,
        upcomingLeads: upcoming,
        followUpsDue,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch follow-up alerts',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Full reports for leads: KPIs, by status/source, over time, follow-up performance. */
export const getLeadReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || '30d';
    const endDate = new Date();
    let startDate: Date;
    if (period === '7d') startDate = subDays(endDate, 7);
    else if (period === '90d') startDate = subDays(endDate, 90);
    else startDate = subDays(endDate, 30);

    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    const [
      leadsInPeriod,
      byStatusAgg,
      bySourceAgg,
      leadsByDayAgg,
      totalLeadsAllTime,
      followUpsInPeriod,
      followUpsCompleted,
      followUpsOverdue,
      topPropertiesAgg,
    ] = await Promise.all([
      Lead.find(dateFilter).lean(),
      Lead.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: dateFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Lead.countDocuments(),
      LeadFollowUp.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
      LeadFollowUp.countDocuments({ createdAt: { $gte: startDate, $lte: endDate }, completedAt: { $ne: null } }),
      LeadFollowUp.countDocuments({ completedAt: null, dueAt: { $lt: endDate } }),
      Lead.aggregate([
        { $match: dateFilter },
        { $match: { propertyName: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$propertyName', slug: { $first: '$propertySlug' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const totalInPeriod = leadsInPeriod.length;
    const won = leadsInPeriod.filter((l: any) => l.status === 'won').length;
    const lost = leadsInPeriod.filter((l: any) => l.status === 'lost').length;
    const conversionRate = totalInPeriod > 0 ? Number(((won / totalInPeriod) * 100).toFixed(2)) : 0;

    const byStatus: Record<string, number> = {};
    byStatusAgg.forEach((s: { _id: string; count: number }) => {
      byStatus[s._id] = s.count;
    });
    const bySource: Record<string, number> = {};
    bySourceAgg.forEach((s: { _id: string; count: number }) => {
      bySource[s._id] = s.count;
    });

    const leadsOverTime = leadsByDayAgg.map((d: { _id: string; count: number }) => ({
      date: d._id,
      leads: d.count,
    }));

    const followUpTotal = followUpsInPeriod;
    const followUpCompleted = followUpsCompleted;
    const followUpCompletionRate = followUpTotal > 0 ? Number(((followUpCompleted / followUpTotal) * 100).toFixed(2)) : 0;

    const topProperties = topPropertiesAgg.map((p: { _id: string; slug?: string; count: number }) => ({
      propertyName: p._id,
      propertySlug: p.slug || '',
      leads: p.count,
    }));

    res.json({
      success: true,
      data: {
        period,
        dateRange: { start: startDate.toISOString(), end: endDate.toISOString() },
        summary: {
          totalLeads: totalLeadsAllTime,
          leadsInPeriod: totalInPeriod,
          won,
          lost,
          conversionRate,
          activeLeads: totalInPeriod - won - lost,
        },
        byStatus,
        bySource,
        leadsOverTime,
        followUp: {
          total: followUpTotal,
          completed: followUpCompleted,
          overdue: followUpsOverdue,
          completionRate: followUpCompletionRate,
        },
        topPropertiesByLeads: topProperties,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead reports',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Dashboard stats for leads. */
export const getLeadStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [total, byStatus, overdueCount, dueTodayCount] = await Promise.all([
      Lead.countDocuments(),
      Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Lead.countDocuments({ nextFollowUpAt: { $lt: new Date(), $ne: null } }),
      Lead.countDocuments({
        nextFollowUpAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      }),
    ]);
    const statusMap: Record<string, number> = {};
    byStatus.forEach((s: { _id: string; count: number }) => {
      statusMap[s._id] = s.count;
    });
    res.json({
      success: true,
      data: {
        total,
        byStatus: statusMap,
        overdueFollowUps: overdueCount,
        dueToday: dueTodayCount,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead stats',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Send reminder emails for follow-ups due (now or in next 24h). Alerts assignee + all admins (email + in-app). */
export const sendDueFollowUpReminders = async (_req: Request, res: Response): Promise<void> => {
  try {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dueFollowUps = await LeadFollowUp.find({
      completedAt: null,
      dueAt: { $lte: in24h },
      emailReminderSentAt: { $exists: false },
    })
      .populate('leadId')
      .lean();
    const adminEmails = await getAdminEmails();
    let sent = 0;
    for (const fu of dueFollowUps) {
      const lead = fu.leadId as any;
      if (!lead || !lead._id) continue;
      const leadDoc = await Lead.findById(lead._id).populate('assignedTo').lean();
      const assignee = leadDoc?.assignedTo as any;
      const assigneeEmail = assignee?.email || process.env.SMTP_FROM_EMAIL;
      if (assigneeEmail) {
        await sendFollowUpReminderEmail({
          assigneeEmail,
          assigneeName: assignee?.name || 'Team',
          leadName: lead.name,
          leadEmail: lead.email,
          leadPhone: lead.phone,
          propertyName: lead.propertyName,
          followUpTitle: fu.title,
          followUpDueAt: fu.dueAt,
          leadId: String(lead._id),
        });
      }
      sendFollowUpDueAlertToAdmins(adminEmails, {
        leadName: lead.name,
        leadEmail: lead.email,
        leadPhone: lead.phone,
        propertyName: lead.propertyName,
        followUpTitle: fu.title,
        followUpDueAt: fu.dueAt,
        followUpType: fu.type,
        leadId: String(lead._id),
        followUpId: String(fu._id),
      });
      await createNotificationsForAdmins({
        title: 'Follow-up due',
        message: `${fu.title} – ${lead.name}${lead.propertyName ? ` (${lead.propertyName})` : ''}`,
        type: 'follow_up_due',
        data: { leadId: String(lead._id), followUpId: String(fu._id) },
      });
      await LeadFollowUp.updateOne({ _id: fu._id }, { $set: { emailReminderSentAt: new Date() } });
      sent++;
    }
    res.json({ success: true, message: `Reminder emails sent: ${sent}`, data: { sent } });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reminders',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
