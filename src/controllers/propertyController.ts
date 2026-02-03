import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Property from '../models/Property';
import path from 'path';
import fs from 'fs';

/* =========================
   Helpers
========================= */

const getFileUrl = (filename: string): string => {
  return `/uploads/properties/${filename}`;
};

const isValidObjectId = (id: string): boolean => {
  return Types.ObjectId.isValid(id);
};

function parseJsonArray<T>(raw: unknown): T[] {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'property';
}

async function generateUniqueSlug(
  base: string,
  excludeId?: string
): Promise<string> {
  const filter: Record<string, unknown> = { slug: base };
  if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
  const exists = await Property.exists(filter);
  if (!exists) return base;
  for (let n = 2; n < 1000; n++) {
    const cand = `${base}-${n}`;
    const f: Record<string, unknown> = { slug: cand };
    if (excludeId) f._id = { $ne: new Types.ObjectId(excludeId) };
    if (!(await Property.exists(f))) return cand;
  }
  return `${base}-${Date.now()}`;
}

/* =========================
   CREATE PROPERTY
========================= */

export const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;

    const images = files?.images?.map(f => getFileUrl(f.filename)) ?? [];
    const videos = files?.videos?.map(f => getFileUrl(f.filename)) ?? [];
    const floorPlan = files?.floorPlan?.[0]
      ? getFileUrl(files.floorPlan[0].filename)
      : undefined;

    const base = slugFromName(req.body.name);
    const slug = await generateUniqueSlug(base);

    type LocItem = { title: string; value: string; description: string; icon: 'navigation' | 'clock' | 'car' | 'mapPin' };
    type HiItem = { title: string; value: string; description: string; color: string };
    const locationInfo = parseJsonArray<LocItem>(req.body.locationInfo);
    const investmentHighlights = parseJsonArray<HiItem>(req.body.investmentHighlights);

    const property = await Property.create({
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
      features: typeof req.body.features === 'string' ? JSON.parse(req.body.features) : req.body.features ?? [],
      amenities: typeof req.body.amenities === 'string' ? JSON.parse(req.body.amenities) : req.body.amenities ?? [],
      locationInfo: locationInfo.length ? locationInfo : undefined,
      investmentHighlights: investmentHighlights.length ? investmentHighlights : undefined,
      images,
      videos,
      floorPlan,
      virtualTour: req.body.virtualTour,
      developer: req.body.developer,
      handoverDate: req.body.handoverDate ? new Date(req.body.handoverDate) : undefined,
      ownershipType: req.body.ownershipType,
      titleDeed: req.body.titleDeed === 'true',
      mortgageAvailable: req.body.mortgageAvailable === 'true',
      metaTitle: req.body.metaTitle,
      metaDescription: req.body.metaDescription,
      featured: req.body.featured === 'true',
      featuredUntil: req.body.featuredUntil ? new Date(req.body.featuredUntil) : undefined,
      isActive: req.body.isActive !== 'false',
      isPublished: req.body.isPublished === 'true',
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: property });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: 'Failed to create property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/* =========================
   GET ALL PROPERTIES
========================= */

export const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: Record<string, unknown> = {};

    if (req.query.propertyType) query.propertyType = req.query.propertyType;
    if (req.query.category) query.category = req.query.category;
    if (req.query.status) query.status = req.query.status;
    if (req.query.city) query['location.city'] = req.query.city;
    if (req.query.area) query['location.area'] = req.query.area;
    if (req.query.featured) query.featured = req.query.featured === 'true';
    if (req.query.isPublished) query.isPublished = req.query.isPublished === 'true';

    if (req.query.minPrice || req.query.maxPrice) {
      query['price.amount'] = {
        ...(req.query.minPrice && { $gte: Number(req.query.minPrice) }),
        ...(req.query.maxPrice && { $lte: Number(req.query.maxPrice) }),
      };
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search as string };
    }

    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 10);
    const skip = (page - 1) * limit;

    const properties = await Property.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/* =========================
   GET PROPERTY BY SLUG (ADMIN – no published filter)
========================= */

export const getPropertyBySlugAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }
    const property = await Property.findOne({ slug: slug.trim().toLowerCase() })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }
    res.json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/* =========================
   GET SINGLE PROPERTY
========================= */

export const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Array.isArray(id) ? id[0] : id;

    if (!isValidObjectId(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID' });
      return;
    }

    const property = await Property.findById(propertyId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    property.views += 1;
    await property.save();

    res.json({ success: true, data: property });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/* =========================
   UPDATE PROPERTY
========================= */

export const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const propertyId = Array.isArray(id) ? id[0] : id;

    if (!isValidObjectId(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID' });
      return;
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    let slug = property.slug;
    if (req.body.name && req.body.name !== property.name) {
      const base = slugFromName(req.body.name);
      slug = await generateUniqueSlug(base, propertyId);
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const newImageUrls = (files?.images ?? []).map((f) => getFileUrl(f.filename));
    const newVideoUrls = (files?.videos ?? []).map((f) => getFileUrl(f.filename));
    const newFloorPlan = files?.floorPlan?.[0]
      ? getFileUrl(files.floorPlan[0].filename)
      : undefined;

    const existingImages = (() => {
      const raw = req.body.existingImages;
      if (!raw) return property.images ?? [];
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : property.images ?? [];
      } catch {
        return property.images ?? [];
      }
    })();
    const existingVideos = (() => {
      const raw = req.body.existingVideos;
      if (!raw) return property.videos ?? [];
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(parsed) ? parsed : property.videos ?? [];
      } catch {
        return property.videos ?? [];
      }
    })();
    const existingFloorPlan = req.body.existingFloorPlan && String(req.body.existingFloorPlan).trim()
      ? String(req.body.existingFloorPlan)
      : property.floorPlan ?? '';

    const images = [...existingImages, ...newImageUrls];
    const videos = [...existingVideos, ...newVideoUrls];
    const floorPlan = newFloorPlan ?? (existingFloorPlan || undefined);

    const updatePayload: Record<string, unknown> = {
      name: req.body.name,
      slug,
      description: req.body.description,
      shortDescription: req.body.shortDescription || undefined,
      propertyType: req.body.propertyType,
      category: req.body.category,
      status: req.body.status || 'available',
      location:
        typeof req.body.location === 'string'
          ? JSON.parse(req.body.location)
          : req.body.location,
      price:
        typeof req.body.price === 'string'
          ? JSON.parse(req.body.price)
          : req.body.price,
      details:
        typeof req.body.details === 'string'
          ? JSON.parse(req.body.details)
          : req.body.details,
      features:
        typeof req.body.features === 'string'
          ? JSON.parse(req.body.features)
          : req.body.features ?? [],
      amenities:
        typeof req.body.amenities === 'string'
          ? JSON.parse(req.body.amenities)
          : req.body.amenities ?? [],
      locationInfo: parseJsonArray<{ title: string; value: string; description: string; icon: 'navigation' | 'clock' | 'car' | 'mapPin' }>(req.body.locationInfo),
      investmentHighlights: parseJsonArray<{ title: string; value: string; description: string; color: string }>(req.body.investmentHighlights),
      images,
      videos,
      floorPlan: floorPlan || undefined,
      virtualTour: req.body.virtualTour || undefined,
      developer: req.body.developer || undefined,
      handoverDate: req.body.handoverDate
        ? new Date(req.body.handoverDate)
        : undefined,
      ownershipType: req.body.ownershipType || undefined,
      titleDeed: req.body.titleDeed === 'true',
      mortgageAvailable: req.body.mortgageAvailable === 'true',
      metaTitle: req.body.metaTitle || undefined,
      metaDescription: req.body.metaDescription || undefined,
      featured: req.body.featured === 'true',
      featuredUntil: req.body.featuredUntil
        ? new Date(req.body.featuredUntil)
        : undefined,
      isActive: req.body.isActive !== 'false',
      isPublished: req.body.isPublished === 'true',
      updatedBy: req.user._id,
    };

    const updated = await Property.findByIdAndUpdate(
      propertyId,
      updatePayload,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: 'Failed to update property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/* =========================
   DELETE PROPERTY
========================= */

export const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Array.isArray(id) ? id[0] : id;

    if (!isValidObjectId(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID' });
      return;
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'properties');

    [...property.images, ...(property.videos ?? []), property.floorPlan]
      .filter(Boolean)
      .forEach(file => {
        const filename = file!.split('/').pop();
        if (!filename) return;

        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      });

    await Property.findByIdAndDelete(propertyId);

    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};


/* =========================
   DELETE PROPERTY IMAGE
========================= */

export const deletePropertyImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, imageUrl } = req.params;
    const propertyId = Array.isArray(id) ? id[0] : id;

    if (!Types.ObjectId.isValid(propertyId)) {
      res.status(400).json({ success: false, message: 'Invalid property ID' });
      return;
    }

    const image = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
    if (!image) {
      res.status(400).json({ success: false, message: 'Image URL is required' });
      return;
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    property.images = property.images.filter(img => img !== image);
    await property.save();

    const filename = image.split('/').pop();
    if (filename) {
      const filePath = path.join(process.cwd(), 'uploads', 'properties', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete property image',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};
