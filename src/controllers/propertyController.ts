import { Request, Response } from 'express';
import Property from '../models/Property';
import { IProperty } from '../types/express';
import path from 'path';
import fs from 'fs';

// Helper to get file URLs
const getFileUrl = (filename: string): string => {
  if (!filename) return '';
  // Return relative path that will be served statically
  return `/uploads/properties/${filename}`;
};

// Create Property
export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // Process uploaded images
    const images: string[] = [];
    if (files.images) {
      images.push(...files.images.map(file => getFileUrl(file.filename)));
    }

    // Process videos
    const videos: string[] = [];
    if (files.videos) {
      videos.push(...files.videos.map(file => getFileUrl(file.filename)));
    }

    // Process floor plan
    let floorPlan = '';
    if (files.floorPlan && files.floorPlan[0]) {
      floorPlan = getFileUrl(files.floorPlan[0].filename);
    }

    // Generate slug from name
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug already exists
    const existingProperty = await Property.findOne({ slug });
    if (existingProperty) {
      res.status(400).json({
        success: false,
        message: 'A property with this name already exists',
      });
      return;
    }

    // Parse JSON fields from form data
    const propertyData: Partial<IProperty> = {
      name: req.body.name,
      slug,
      description: req.body.description,
      shortDescription: req.body.shortDescription,
      propertyType: req.body.propertyType,
      category: req.body.category,
      status: req.body.status || 'available',
      location: typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location,
      price: typeof req.body.price === 'string' ? JSON.parse(req.body.price) : req.body.price,
      details: typeof req.body.details === 'string' ? JSON.parse(req.body.details) : req.body.details,
      features: typeof req.body.features === 'string' ? JSON.parse(req.body.features) : (req.body.features || []),
      amenities: typeof req.body.amenities === 'string' ? JSON.parse(req.body.amenities) : (req.body.amenities || []),
      images,
      videos,
      floorPlan,
      virtualTour: req.body.virtualTour,
      developer: req.body.developer,
      handoverDate: req.body.handoverDate ? new Date(req.body.handoverDate) : undefined,
      ownershipType: req.body.ownershipType,
      titleDeed: req.body.titleDeed === 'true' || req.body.titleDeed === true,
      mortgageAvailable: req.body.mortgageAvailable === 'true' || req.body.mortgageAvailable === true,
      metaTitle: req.body.metaTitle,
      metaDescription: req.body.metaDescription,
      featured: req.body.featured === 'true' || req.body.featured === true,
      featuredUntil: req.body.featuredUntil ? new Date(req.body.featuredUntil) : undefined,
      isActive: req.body.isActive !== 'false',
      isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
      createdBy: req.user._id,
    };

    const property = await Property.create(propertyData);

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      success: false,
      message: 'Failed to create property',
      error: errorMessage,
    });
  }
};

// Get All Properties
export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      propertyType,
      category,
      status,
      minPrice,
      maxPrice,
      city,
      area,
      search,
      featured,
      isPublished,
    } = req.query;

    const query: any = {};

    if (propertyType) query.propertyType = propertyType;
    if (category) query.category = category;
    if (status) query.status = status;
    if (city) query['location.city'] = city;
    if (area) query['location.area'] = area;
    if (featured !== undefined) query.featured = featured === 'true';
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    // Price range
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = Number(minPrice);
      if (maxPrice) query['price.amount'].$lte = Number(maxPrice);
    }

    // Search
    if (search) {
      query.$text = { $search: search as string };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const properties = await Property.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: errorMessage,
    });
  }
};

// Get Single Property
export const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found',
      });
      return;
    }

    // Increment views
    property.views += 1;
    await property.save();

    res.json({
      success: true,
      data: property,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: errorMessage,
    });
  }
};

// Update Property
export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { id } = req.params;
    const property = await Property.findById(id);

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found',
      });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Process new images (append to existing)
    let images = property.images || [];
    if (files.images) {
      const newImages = files.images.map(file => getFileUrl(file.filename));
      images = [...images, ...newImages];
    }

    // Process new videos
    let videos = property.videos || [];
    if (files.videos) {
      const newVideos = files.videos.map(file => getFileUrl(file.filename));
      videos = [...videos, ...newVideos];
    }

    // Process floor plan
    let floorPlan = property.floorPlan || '';
    if (files.floorPlan && files.floorPlan[0]) {
      floorPlan = getFileUrl(files.floorPlan[0].filename);
    }

    // Update slug if name changed
    let slug = property.slug;
    if (req.body.name && req.body.name !== property.name) {
      slug = req.body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      // Check if new slug exists
      const existingProperty = await Property.findOne({ slug, _id: { $ne: id } });
      if (existingProperty) {
        res.status(400).json({
          success: false,
          message: 'A property with this name already exists',
        });
        return;
      }
    }

    // Parse JSON fields
    const updateData: any = {
      ...(req.body.name && { name: req.body.name }),
      ...(slug !== property.slug && { slug }),
      ...(req.body.description && { description: req.body.description }),
      ...(req.body.shortDescription !== undefined && { shortDescription: req.body.shortDescription }),
      ...(req.body.propertyType && { propertyType: req.body.propertyType }),
      ...(req.body.category && { category: req.body.category }),
      ...(req.body.status && { status: req.body.status }),
      ...(req.body.location && {
        location: typeof req.body.location === 'string' ? JSON.parse(req.body.location) : req.body.location,
      }),
      ...(req.body.price && {
        price: typeof req.body.price === 'string' ? JSON.parse(req.body.price) : req.body.price,
      }),
      ...(req.body.details && {
        details: typeof req.body.details === 'string' ? JSON.parse(req.body.details) : req.body.details,
      }),
      ...(req.body.features !== undefined && {
        features: typeof req.body.features === 'string' ? JSON.parse(req.body.features) : req.body.features,
      }),
      ...(req.body.amenities !== undefined && {
        amenities: typeof req.body.amenities === 'string' ? JSON.parse(req.body.amenities) : req.body.amenities,
      }),
      images,
      videos,
      ...(floorPlan && { floorPlan }),
      ...(req.body.virtualTour !== undefined && { virtualTour: req.body.virtualTour }),
      ...(req.body.developer !== undefined && { developer: req.body.developer }),
      ...(req.body.handoverDate && { handoverDate: new Date(req.body.handoverDate) }),
      ...(req.body.ownershipType !== undefined && { ownershipType: req.body.ownershipType }),
      ...(req.body.titleDeed !== undefined && {
        titleDeed: req.body.titleDeed === 'true' || req.body.titleDeed === true,
      }),
      ...(req.body.mortgageAvailable !== undefined && {
        mortgageAvailable: req.body.mortgageAvailable === 'true' || req.body.mortgageAvailable === true,
      }),
      ...(req.body.metaTitle !== undefined && { metaTitle: req.body.metaTitle }),
      ...(req.body.metaDescription !== undefined && { metaDescription: req.body.metaDescription }),
      ...(req.body.featured !== undefined && {
        featured: req.body.featured === 'true' || req.body.featured === true,
      }),
      ...(req.body.featuredUntil && { featuredUntil: new Date(req.body.featuredUntil) }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive !== 'false' }),
      ...(req.body.isPublished !== undefined && {
        isPublished: req.body.isPublished === 'true' || req.body.isPublished === true,
      }),
      updatedBy: req.user._id,
    };

    const updatedProperty = await Property.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('createdBy', 'name email').populate('updatedBy', 'name email');

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: updatedProperty,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(400).json({
      success: false,
      message: 'Failed to update property',
      error: errorMessage,
    });
  }
};

// Delete Property
export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found',
      });
      return;
    }

    // Delete associated files
    const uploadsDir = path.join(process.cwd(), 'uploads', 'properties');
    const filesToDelete = [
      ...property.images,
      ...(property.videos || []),
      ...(property.floorPlan ? [property.floorPlan] : []),
    ];

    filesToDelete.forEach((filePath) => {
      if (filePath) {
        const filename = filePath.split('/').pop();
        if (filename) {
          const filePathToDelete = path.join(uploadsDir, filename);
          if (fs.existsSync(filePathToDelete)) {
            fs.unlinkSync(filePathToDelete);
          }
        }
      }
    });

    await Property.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: errorMessage,
    });
  }
};

// Delete Property Image
export const deletePropertyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageUrl } = req.params;

    // Ensure imageUrl is a string
    const imageUrlString = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    if (!imageUrlString) {
      res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
      return;
    }

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found',
      });
      return;
    }

    // Remove image from array
    property.images = property.images.filter(img => img !== imageUrlString);
    await property.save();

    // Delete file from filesystem
    const filename = imageUrlString.split('/').pop();
    if (filename) {
      const filePath = path.join(process.cwd(), 'uploads', 'properties', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: errorMessage,
    });
  }
};
