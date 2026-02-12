import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IQuery {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  message: string;
  subject?: string;
  source: 'contact_page' | 'lead_form' | 'other';
  interestedProperty?: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  assignedTo?: Types.ObjectId;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const querySchema = new Schema<IQuery>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    subject: { type: String, trim: true },
    source: {
      type: String,
      enum: ['contact_page', 'lead_form', 'property_detail', 'mobile_app', 'other'],
      default: 'contact_page',
    },
    interestedProperty: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'resolved', 'closed'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    notes: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

querySchema.index({ status: 1, createdAt: -1 });
querySchema.index({ email: 1 });
querySchema.index({ source: 1 });
querySchema.index({ createdAt: -1 });

const Query: Model<IQuery> = mongoose.model<IQuery>('Query', querySchema);
export default Query;
