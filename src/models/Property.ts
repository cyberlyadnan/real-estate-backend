import mongoose, {
  Schema,
  Model,
  HydratedDocument,
} from 'mongoose';
import { IProperty } from '../types/express';

const propertySchema = new Schema<IProperty>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    propertyType: {
      type: String,
      enum: [
        'apartment',
        'villa',
        'penthouse',
        'townhouse',
        'commercial',
        'land',
        'office',
      ],
      required: true,
    },
    category: {
      type: String,
      enum: ['sale', 'rent', 'both'],
      default: 'sale',
      required: true,
    },
    status: {
      type: String,
      enum: ['available', 'sold', 'rented', 'pending', 'off-market'],
      default: 'available',
    },

    location: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      area: { type: String, required: true },
      emirate: { type: String, required: true },
      country: { type: String, default: 'United Arab Emirates' },
      zipCode: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      landmarks: [{ type: String }],
    },

    price: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'AED' },
      pricePerSqft: Number,
      originalPrice: Number,
      discount: Number,
      paymentPlan: String,
      downPayment: Number,
      monthlyPayment: Number,
    },

    details: {
      bedrooms: { type: Number, required: true },
      bathrooms: { type: Number, required: true },
      parking: { type: Number, required: true },
      area: {
        builtUp: { type: Number, required: true },
        plot: Number,
        balcony: Number,
      },
      yearBuilt: Number,
      floorNumber: Number,
      totalFloors: Number,
      furnishing: {
        type: String,
        enum: ['furnished', 'semi-furnished', 'unfurnished'],
      },
      facing: String,
    },

    features: [{ type: String }],
    amenities: [{ type: String }],

    images: [{ type: String, required: true }],
    videos: [{ type: String }],
    virtualTour: String,
    floorPlan: String,

    developer: String,
    handoverDate: Date,
    ownershipType: {
      type: String,
      enum: ['freehold', 'leasehold'],
    },
    titleDeed: { type: Boolean, default: false },
    mortgageAvailable: { type: Boolean, default: false },

    metaTitle: { type: String, maxlength: 60 },
    metaDescription: { type: String, maxlength: 160 },
    featured: { type: Boolean, default: false },
    featuredUntil: Date,

    isActive: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },

    // ✅ FIXED ObjectId typing
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Pre-save hook (Mongoose 9+ compatible - async without next callback)
propertySchema.pre(
  'save',
  async function (this: HydratedDocument<IProperty>) {
    if (this.isModified('name') && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
  }
);

propertySchema.index({
  name: 'text',
  description: 'text',
  'location.address': 'text',
});
propertySchema.index({ propertyType: 1, category: 1, status: 1 });
propertySchema.index({ 'price.amount': 1 });
propertySchema.index({ featured: 1, isPublished: 1, isActive: 1 });
propertySchema.index({ slug: 1 });

const Property: Model<IProperty> = mongoose.model<IProperty>(
  'Property',
  propertySchema
);

export default Property;
