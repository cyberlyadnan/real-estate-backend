import { Types } from 'mongoose';

/* =========================
   USER
========================= */

// IUser is now defined in models/User.ts and exported from there
// Re-export here for backward compatibility with existing code
export type { IUser } from '../models/User';

/* =========================
   PROPERTY
========================= */

export interface IProperty {
  _id: Types.ObjectId;

  // Basic Information
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;

  // Property Type & Category
  propertyType:
    | 'apartment'
    | 'villa'
    | 'penthouse'
    | 'townhouse'
    | 'commercial'
    | 'land'
    | 'office';
  category: 'sale' | 'rent' | 'both';
  status: 'available' | 'sold' | 'rented' | 'pending' | 'off-market';

  // Location
  location: {
    address: string;
    city: string;
    area: string;
    emirate: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    landmarks?: string[];
  };

  // Pricing
  price: {
    amount: number;
    currency: string;
    pricePerSqft?: number;
    originalPrice?: number;
    discount?: number;
    paymentPlan?: string;
    downPayment?: number;
    monthlyPayment?: number;
  };

  // Property Details
  details: {
    bedrooms: number;
    bathrooms: number;
    parking: number;
    area: {
      builtUp: number;
      plot?: number;
      balcony?: number;
    };
    yearBuilt?: number;
    floorNumber?: number;
    totalFloors?: number;
    furnishing?: 'furnished' | 'semi-furnished' | 'unfurnished';
    facing?: string;
  };

  // Features & Amenities
  features: string[];
  amenities: string[];

  // Media
  images: string[];
  videos?: string[];
  virtualTour?: string;
  floorPlan?: string;

  // Additional Information
  developer?: string;
  handoverDate?: Date;
  ownershipType?: 'freehold' | 'leasehold';
  titleDeed?: boolean;
  mortgageAvailable?: boolean;

  // SEO & Marketing
  metaTitle?: string;
  metaDescription?: string;
  featured: boolean;
  featuredUntil?: Date;

  // Status & Management
  isActive: boolean;
  isPublished: boolean;
  views: number;
  likes: number;

  // Relations (✅ FIXED)
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

/* =========================
   API TYPES
========================= */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
  };
  accessToken: string;
  refreshToken: string;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

/* =========================
   EXPRESS AUGMENTATION
========================= */

declare global {
  namespace Express {
    interface Request {
      // The authenticate middleware sets the full user document
      user?: IUser;
    }
  }
}
