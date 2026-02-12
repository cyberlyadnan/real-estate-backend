import mongoose, { Schema, Model, Types } from 'mongoose';

export interface IPageView {
  _id: Types.ObjectId;
  sessionId: string;
  visitorId: string;
  ipAddress?: string;
  userAgent?: string;
  page: string;
  referrer?: string;
  propertyId?: Types.ObjectId;
  propertySlug?: string;
  duration?: number; // Time spent on page in seconds
  device?: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  country?: string;
  city?: string;
  isUnique: boolean; // First visit from this visitor
  isReturning: boolean; // Returning visitor
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalyticsSummary {
  _id: Types.ObjectId;
  date: Date; // Date for this summary (daily aggregation)
  totalVisits: number;
  uniqueVisitors: number;
  returningVisitors: number;
  totalPageViews: number;
  avgSessionDuration: number; // Average time in seconds
  bounceRate: number; // Percentage
  topPages: Array<{
    page: string;
    views: number;
  }>;
  topProperties: Array<{
    propertyId: Types.ObjectId;
    propertySlug: string;
    propertyName: string;
    views: number;
  }>;
  deviceBreakdown: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  browserBreakdown: Array<{
    browser: string;
    count: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    count: number;
  }>;
  topCountries: Array<{
    country: string;
    count: number;
  }>;
  leadConversions: number; // Number of leads generated
  conversionRate: number; // Percentage
  createdAt: Date;
  updatedAt: Date;
}

const pageViewSchema = new Schema<IPageView>(
  {
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    page: { type: String, required: true, index: true },
    referrer: { type: String },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', index: true },
    propertySlug: { type: String, index: true },
    duration: { type: Number, default: 0 },
    device: { 
      type: String, 
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop'
    },
    browser: { type: String },
    os: { type: String },
    country: { type: String },
    city: { type: String },
    isUnique: { type: Boolean, default: false },
    isReturning: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for efficient querying
pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ visitorId: 1, createdAt: -1 });
pageViewSchema.index({ propertyId: 1, createdAt: -1 });
pageViewSchema.index({ page: 1, createdAt: -1 });

const analyticsSummarySchema = new Schema<IAnalyticsSummary>(
  {
    date: { type: Date, required: true, unique: true, index: true },
    totalVisits: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 },
    totalPageViews: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    topPages: [{
      page: String,
      views: Number,
    }],
    topProperties: [{
      propertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
      propertySlug: String,
      propertyName: String,
      views: Number,
    }],
    deviceBreakdown: {
      mobile: { type: Number, default: 0 },
      tablet: { type: Number, default: 0 },
      desktop: { type: Number, default: 0 },
    },
    browserBreakdown: [{
      browser: String,
      count: Number,
    }],
    topReferrers: [{
      referrer: String,
      count: Number,
    }],
    topCountries: [{
      country: String,
      count: Number,
    }],
    leadConversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

analyticsSummarySchema.index({ date: -1 });

export const PageView: Model<IPageView> = mongoose.model<IPageView>('PageView', pageViewSchema);
export const AnalyticsSummary: Model<IAnalyticsSummary> = mongoose.model<IAnalyticsSummary>('AnalyticsSummary', analyticsSummarySchema);
