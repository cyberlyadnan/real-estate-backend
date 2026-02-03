import mongoose, { Schema, Model, Types } from 'mongoose';

export type FollowUpType = 'call' | 'email' | 'meeting' | 'whatsapp' | 'site_visit' | 'document' | 'other';

export interface ILeadFollowUp {
  _id: Types.ObjectId;
  leadId: Types.ObjectId;
  dueAt: Date;
  type: FollowUpType;
  title: string;
  notes?: string;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  /** When reminder email was sent (to avoid duplicate emails) */
  emailReminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadFollowUpSchema = new Schema<ILeadFollowUp>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    dueAt: { type: Date, required: true },
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'whatsapp', 'site_visit', 'document', 'other'],
      default: 'call',
    },
    title: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    completedAt: { type: Date },
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    emailReminderSentAt: { type: Date },
  },
  { timestamps: true }
);

leadFollowUpSchema.index({ leadId: 1, dueAt: 1 });
leadFollowUpSchema.index({ dueAt: 1 });
leadFollowUpSchema.index({ completedAt: 1 });

const LeadFollowUp: Model<ILeadFollowUp> = mongoose.model<ILeadFollowUp>('LeadFollowUp', leadFollowUpSchema);
export default LeadFollowUp;
