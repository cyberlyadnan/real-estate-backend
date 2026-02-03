import { Request, Response } from 'express';
import Notification from '../models/Notification';
import { Types } from 'mongoose';

/** GET /notifications – list for current user, unread first, paginated. */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const unreadOnly = req.query.unread === 'true';
    const filter: Record<string, unknown> = { recipient: userId };
    if (unreadOnly) filter.read = false;
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });
    res.json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** PATCH /notifications/:id/read – mark one as read. */
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!userId || !id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid notification ID' });
      return;
    }
    const notif = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { read: true } },
      { new: true }
    ).lean();
    if (!notif) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/** PATCH /notifications/read-all – mark all as read for current user. */
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, data: { modifiedCount: result.modifiedCount } });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
