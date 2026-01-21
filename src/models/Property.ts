import mongoose, { Schema, Model } from 'mongoose';
import { IProperty } from '../types/express';

const propertySchema = new Schema<IProperty>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Property name is required'],
      trim: true,
      maxlength: [200, 'Property name cannot exceed 200 characters'],
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
      required: [true, 'Property description is required'],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Short description cannot exceed 300 characters'],
    },
    
    // Property Type & Category
    propertyType: {
      type: String,
      enum: ['apartment', 'villa', 'penthouse', 'townhouse', 'commercial', 'land', 'office'],
      required: [true, 'Property type is required'],
    },
    category: {
      type: String,
      enum: ['sale', 'rent', 'both'],
      required: [true, 'Category is required'],
      default: 'sale',
    },
    status: {
      type: String,
      enum: ['available', 'sold', 'rented', 'pending', 'off-market'],
      default: 'available',
    },
    
    // Location
    location: {
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'City is required'],
        trim: true,
      },
      area: {
        type: String,
        required: [true, 'Area is required'],
        trim: true,
      },
      emirate: {
        type: String,
        required: [true, 'Emirate is required'],
        trim: true,
      },
      country: {
        type: String,
        default: 'United Arab Emirates',
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      coordinates: {
        lat: {
          type: Number,
          min: -90,
          max: 90,
        },
        lng: {
          type: Number,
          min: -180,
          max: 180,
        },
      },
      landmarks: [{
        type: String,
        trim: true,
      }],
    },
    
    // Pricing
    price: {
      amount: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
      },
      currency: {
        type: String,
        default: 'AED',
        uppercase: true,
      },
      pricePerSqft: {
        type: Number,
        min: [0, 'Price per sqft cannot be negative'],
      },
      originalPrice: {
        type: Number,
        min: [0, 'Original price cannot be negative'],
      },
      discount: {
        type: Number,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
      },
      paymentPlan: {
        type: String,
        trim: true,
      },
      downPayment: {
        type: Number,
        min: [0, 'Down payment cannot be negative'],
      },
      monthlyPayment: {
        type: Number,
        min: [0, 'Monthly payment cannot be negative'],
      },
    },
    
    // Property Details
    details: {
      bedrooms: {
        type: Number,
        required: [true, 'Number of bedrooms is required'],
        min: [0, 'Bedrooms cannot be negative'],
      },
      bathrooms: {
        type: Number,
        required: [true, 'Number of bathrooms is required'],
        min: [0, 'Bathrooms cannot be negative'],
      },
      parking: {
        type: Number,
        required: [true, 'Number of parking spaces is required'],
        min: [0, 'Parking cannot be negative'],
      },
      area: {
        builtUp: {
          type: Number,
          required: [true, 'Built-up area is required'],
          min: [0, 'Area cannot be negative'],
        },
        plot: {
          type: Number,
          min: [0, 'Plot area cannot be negative'],
        },
        balcony: {
          type: Number,
          min: [0, 'Balcony area cannot be negative'],
        },
      },
      yearBuilt: {
        type: Number,
        min: [1800, 'Year built must be valid'],
        max: [new Date().getFullYear() + 10, 'Year built cannot be in the future'],
      },
      floorNumber: {
        type: Number,
        min: [0, 'Floor number cannot be negative'],
      },
      totalFloors: {
        type: Number,
        min: [1, 'Total floors must be at least 1'],
      },
      furnishing: {
        type: String,
        enum: ['furnished', 'semi-furnished', 'unfurnished'],
      },
      facing: {
        type: String,
        trim: true,
      },
    },
    
    // Features & Amenities
    features: [{
      type: String,
      trim: true,
    }],
    amenities: [{
      type: String,
      trim: true,
    }],
    
    // Media
    images: [{
      type: String,
      required: [true, 'At least one image is required'],
    }],
    videos: [{
      type: String,
    }],
    virtualTour: {
      type: String,
      trim: true,
    },
    floorPlan: {
      type: String,
      trim: true,
    },
    
    // Additional Information
    developer: {
      type: String,
      trim: true,
    },
    handoverDate: {
      type: Date,
    },
    ownershipType: {
      type: String,
      enum: ['freehold', 'leasehold'],
    },
    titleDeed: {
      type: Boolean,
      default: false,
    },
    mortgageAvailable: {
      type: Boolean,
      default: false,
    },
    
    // SEO & Marketing
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [60, 'Meta title cannot exceed 60 characters'],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [160, 'Meta description cannot exceed 160 characters'],
    },
    featured: {
      type: Boolean,
      default: false,
    },
    featuredUntil: {
      type: Date,
    },
    
    // Status & Management
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    
    // Relations
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    } as any,
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    } as any,
  },
  {
    timestamps: true,
  }
);

// Generate slug from name before saving
// Using type assertion to work around Mongoose TypeScript strict typing
(propertySchema as any).pre('save', async function (this: IProperty, next?: (err?: Error) => void) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  if (next && typeof next === 'function') {
    next();
  }
});

// Index for search optimization
propertySchema.index({ name: 'text', description: 'text', 'location.address': 'text' });
propertySchema.index({ propertyType: 1, category: 1, status: 1 });
propertySchema.index({ 'price.amount': 1 });
propertySchema.index({ featured: 1, isPublished: 1, isActive: 1 });
propertySchema.index({ slug: 1 });

const Property: Model<IProperty> = mongoose.model<IProperty>('Property', propertySchema);

export default Property;
