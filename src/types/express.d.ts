import { Document } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  refreshToken?: string;
  refreshTokenExpiry?: Date;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IProperty extends Document {
  _id: string;
  // Basic Information
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  
  // Property Type & Category
  propertyType: 'apartment' | 'villa' | 'penthouse' | 'townhouse' | 'commercial' | 'land' | 'office';
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
      builtUp: number; // sqft
      plot?: number; // sqft
      balcony?: number; // sqft
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
  
  // Relations
  createdBy: string; // User ID
  updatedBy?: string; // User ID
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
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
    role: string;
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

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
