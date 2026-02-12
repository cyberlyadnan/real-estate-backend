import mongoose, { Schema, Model, Types } from 'mongoose';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'nurturing';

export type LeadPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ILead {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  message: string;
  source: 'contact_page' | 'lead_form' | 'property_detail' | 'mobile_app' | 'whatsapp' | 'other';
  /** Property this lead is interested in */
  propertyId?: Types.ObjectId;
  propertySlug?: string;
  propertyName?: string;
  status: LeadStatus;
  priority: LeadPriority;
  notes?: string;
  assignedTo?: Types.ObjectId;
  /** Next suggested follow-up date – used for alerts */
  nextFollowUpAt?: Date;
  /** Link to original query if created from query form */
  queryId?: Types.ObjectId;
  tags?: string[];
  /** Conversion value (optional) */
  estimatedValue?: number;
  currency?: string;
  /** Budget / price range */
  budget?: number;
  budgetMax?: number;
  /** Preferred area (e.g. Palm Jumeirah, Downtown) */
  preferredArea?: string;
  /** Full address if provided */
  address?: string;
  /** Last / preferred mode of conversation */
  lastContactMode?: 'call' | 'email' | 'whatsapp' | 'meeting' | 'site_visit' | 'other';
  /** Conversation history summary (optional) */
  contactHistory?: string;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    source: {
      type: String,
      enum: ['contact_page', 'lead_form', 'property_detail', 'mobile_app', 'whatsapp', 'other'],
      default: 'lead_form',
    },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
    propertySlug: { type: String, trim: true },
    propertyName: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurturing'],
      default: 'new',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    notes: { type: String, trim: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    nextFollowUpAt: { type: Date },
    queryId: { type: Schema.Types.ObjectId, ref: 'Query' },
    tags: [{ type: String, trim: true }],
    estimatedValue: { type: Number },
    currency: { type: String, default: 'AED' },
    budget: { type: Number },
    budgetMax: { type: Number },
    preferredArea: { type: String, trim: true },
    address: { type: String, trim: true },
    lastContactMode: {
      type: String,
      enum: ['call', 'email', 'whatsapp', 'meeting', 'site_visit', 'other'],
    },
    contactHistory: { type: String, trim: true },
  },
  { timestamps: true }
);

leadSchema.index({ status: 1, nextFollowUpAt: 1 });
leadSchema.index({ assignedTo: 1, nextFollowUpAt: 1 });
leadSchema.index({ propertyId: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ nextFollowUpAt: 1 });

const Lead: Model<ILead> = mongoose.model<ILead>('Lead', leadSchema);
export default Lead;
