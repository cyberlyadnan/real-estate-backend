import { Request, Response } from 'express';
import Property from '../models/Property';

/**
 * GET /api/public/properties
 * List published, active properties. No auth required.
 */
export const getPublicProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const query: Record<string, unknown> = {
      isPublished: { $ne: false },
      isActive: { $ne: false },
    };
    if (req.query.featured === 'true') query.featured = true;
    if (req.query.limit) {
      // only use limit from query
    }
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const properties = await Property.find(query)
      .select('-createdBy -updatedBy -__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Property.countDocuments(query);

    res.json({
      success: true,
      data: properties,
      pagination: { limit, skip, total },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch properties',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
};

/**
 * GET /api/public/properties/slug/:slug
 * Get single published property by slug. No auth required.
 */
export const getPropertyBySlug = async (req: Request, res: Response): Promise<void> => {
  try {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    if (!slug || typeof slug !== 'string') {
      res.status(400).json({ success: false, message: 'Invalid slug' });
      return;
    }

    const property = await Property.findOne({
      slug: slug.trim().toLowerCase(),
      isPublished: { $ne: false },
      isActive: { $ne: false },
    }).lean();

    if (!property) {
      res.status(404).json({ success: false, message: 'Property not found' });
      return;
    }

    await Property.updateOne(
      { _id: property._id },
      { $inc: { views: 1 } }
    );

    res.json({ success: true, data: { ...property, views: (property.views ?? 0) + 1 } });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch property',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}
