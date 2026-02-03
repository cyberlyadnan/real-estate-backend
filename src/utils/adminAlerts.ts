import User from '../models/User';
import Notification from '../models/Notification';
import { Types } from 'mongoose';

export interface AdminUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
}

/** Get all active admin users (for email + in-app notifications). */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const users = await User.find({ role: 'admin', isActive: true })
    .select('email name')
    .lean();
  return users as AdminUser[];
}

/** Get admin emails; use ADMIN_EMAIL env if set (comma-separated), else from DB. */
export async function getAdminEmails(): Promise<string[]> {
  const envEmails = process.env.ADMIN_EMAIL;
  if (envEmails && envEmails.trim()) {
    return envEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  }
  const admins = await getAdminUsers();
  return admins.map((a) => a.email);
}

/**
 * Create in-app notification for every admin (so each admin sees it in their bell).
 */
export async function createNotificationsForAdmins(params: {
  title: string;
  message: string;
  type: 'new_lead' | 'new_enquiry' | 'follow_up_due';
  data?: { leadId?: string; followUpId?: string; queryId?: string };
}): Promise<void> {
  const admins = await getAdminUsers();
  if (admins.length === 0) return;
  await Notification.insertMany(
    admins.map((a) => ({
      recipient: a._id,
      title: params.title,
      message: params.message,
      type: params.type,
      data: params.data,
    }))
  );
}
