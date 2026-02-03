import mongoose, { Schema, Model, Types } from 'mongoose';

export type NotificationType = 'new_lead' | 'new_enquiry' | 'follow_up_due';

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  /** Optional payload: leadId, followUpId, queryId for deep links */
  data?: {
    leadId?: string;
    followUpId?: string;
    queryId?: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['new_lead', 'new_enquiry', 'follow_up_due'],
      required: true,
    },
    data: {
      leadId: String,
      followUpId: String,
      queryId: String,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
