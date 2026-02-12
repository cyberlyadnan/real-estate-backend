import { Request, Response } from 'express';
import Query from '../models/Query';
import Lead from '../models/Lead';
import LeadFollowUp from '../models/LeadFollowUp';
import { Types } from 'mongoose';
import {
  sendQueryConfirmationEmail,
  sendNewLeadAlertToAdmins,
  sendNewEnquiryAlertToAdmins,
} from '../utils/email';
import { normalizePhone, isValidPhone } from '../utils/phone';
import { getAdminEmails, createNotificationsForAdmins } from '../utils/adminAlerts';

/** Default hours until first follow-up for new leads from property detail. */
const DEFAULT_FIRST_FOLLOW_UP_HOURS = 24;

/** Create query (public - no auth). When source is lead_form and propertySlug/propertyId provided, also creates a Lead and first follow-up. */
export const createQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, message, subject, source, interestedProperty, propertySlug, propertyId, propertyName } = req.body;
    if (!name || !email || !phone || !message) {
      res.status(400).json({
        success: false,
        message: 'Name, email, phone and message are required',
      });
      return;
    }
    const phoneNormalized = normalizePhone(phone);
    if (!isValidPhone(phoneNormalized)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (at least 10 digits, with country code).',
      });
      return;
    }
    const sourceVal = ['contact_page', 'lead_form', 'property_detail', 'mobile_app', 'other'].includes(source) ? source : 'contact_page';
    const interestedProp = interestedProperty ? String(interestedProperty).trim() : (propertyName ? String(propertyName).trim() : undefined);
    const slug = propertySlug ? String(propertySlug).trim() : undefined;
    const propId = propertyId && Types.ObjectId.isValid(propertyId) ? new Types.ObjectId(propertyId) : undefined;
    const propName = propertyName ? String(propertyName).trim() : interestedProp;

    const query = await Query.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phoneNormalized,
      message: String(message).trim(),
      subject: subject ? String(subject).trim() : undefined,
      source: sourceVal,
      interestedProperty: interestedProp,
    });

    // Create Lead when enquiry is from property detail (has property context) – it's a lead, not just a query
    let lead: { _id: Types.ObjectId; name: string; email: string; phone: string; message: string; propertyName?: string } | null = null;
    if (slug || propId || propName) {
      const nextFollowUp = new Date();
      nextFollowUp.setHours(nextFollowUp.getHours() + DEFAULT_FIRST_FOLLOW_UP_HOURS);
      lead = await Lead.create({
        name: query.name,
        email: query.email,
        phone: phoneNormalized,
        message: query.message,
        source: sourceVal === 'mobile_app' ? 'mobile_app' : (slug || propId ? 'property_detail' : 'lead_form'),
        propertyId: propId,
        propertySlug: slug,
        propertyName: propName || interestedProp,
        queryId: query._id,
        nextFollowUpAt: nextFollowUp,
      });
      await LeadFollowUp.create({
        leadId: lead._id,
        dueAt: nextFollowUp,
        type: 'call',
        title: 'First follow-up – new lead',
        notes: `Lead from property: ${propName || interestedProp || 'N/A'}. Contact to discuss interest.`,
      });
    }

    // Admin alerts: email + in-app notification
    getAdminEmails()
      .then((adminEmails) => {
        if (lead) {
          sendNewLeadAlertToAdmins(adminEmails, {
            leadName: query.name,
            leadEmail: query.email,
            leadPhone: phoneNormalized,
            propertyName: propName || undefined,
            message: query.message,
            leadId: String(lead._id),
            queryId: String(query._id),
          });
        } else {
          sendNewEnquiryAlertToAdmins(adminEmails, {
            name: query.name,
            email: query.email,
            phone: phoneNormalized,
            message: query.message,
            source: sourceVal,
            interestedProperty: interestedProp,
            queryId: String(query._id),
          });
        }
      })
      .catch((err) => console.error('[Alerts] getAdminEmails failed', err));
    createNotificationsForAdmins({
      title: lead ? 'New lead received' : 'New enquiry received',
      message: lead
        ? `${query.name} – ${propName || 'Property'}`
        : `${query.name} – ${query.email}`,
      type: lead ? 'new_lead' : 'new_enquiry',
      data: lead
        ? { leadId: String(lead._id), queryId: String(query._id) }
        : { queryId: String(query._id) },
    }).catch((err) => console.error('[Alerts] createNotificationsForAdmins failed', err));

    await sendQueryConfirmationEmail({
      recipientName: query.name,
      recipientEmail: query.email,
      message: query.message,
      source: query.source as 'contact_page' | 'lead_form' | 'other',
      interestedProperty: query.interestedProperty,
    });
    res.status(201).json({ success: true, data: query, message: 'Query submitted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit query',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Get all queries (admin) - with filters, search, pagination, sort. */
export const getQueries = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const sortBy = String(req.query.sortBy || 'createdAt');
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter: Record<string, unknown> = {};

    if (status && ['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
      filter.status = status;
    }
    if (source && ['contact_page', 'lead_form', 'property_detail', 'mobile_app', 'other'].includes(source)) {
      filter.source = source;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { interestedProperty: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    if (['name', 'email', 'status', 'source', 'createdAt', 'updatedAt'].includes(sortBy)) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1;
    }

    const [queries, total] = await Promise.all([
      Query.find(filter).sort(sort).skip(skip).limit(limit).populate('assignedTo', 'name email').lean(),
      Query.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: queries,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch queries',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Get single query by ID (admin). */
export const getQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid query ID' });
      return;
    }
    const query = await Query.findById(id).populate('assignedTo', 'name email').lean();
    if (!query) {
      res.status(404).json({ success: false, message: 'Query not found' });
      return;
    }
    res.json({ success: true, data: query });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch query',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Update query (admin) - status, notes, assignedTo, priority. */
export const updateQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid query ID' });
      return;
    }
    const { status, notes, assignedTo, priority } = req.body;
    const update: Record<string, unknown> = {};
    if (status && ['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
      update.status = status;
    }
    if (notes !== undefined) update.notes = String(notes).trim();
    if (assignedTo !== undefined) {
      update.assignedTo = assignedTo && Types.ObjectId.isValid(assignedTo) ? new Types.ObjectId(assignedTo) : null;
    }
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      update.priority = priority;
    }

    const query = await Query.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate('assignedTo', 'name email')
      .lean();

    if (!query) {
      res.status(404).json({ success: false, message: 'Query not found' });
      return;
    }
    res.json({ success: true, data: query, message: 'Query updated successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update query',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Delete query (admin). */
export const deleteQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid query ID' });
      return;
    }
    const query = await Query.findByIdAndDelete(id);
    if (!query) {
      res.status(404).json({ success: false, message: 'Query not found' });
      return;
    }
    res.json({ success: true, message: 'Query deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete query',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** Bulk update status (admin). */
export const bulkUpdateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !['new', 'in_progress', 'resolved', 'closed'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid ids or status' });
      return;
    }
    const validIds = ids.filter((id: string) => Types.ObjectId.isValid(id)).map((id: string) => new Types.ObjectId(id));
    const result = await Query.updateMany({ _id: { $in: validIds } }, { $set: { status } });
    res.json({
      success: true,
      message: `${result.modifiedCount} queries updated`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
