import express from 'express';
import {
  createProperty,
  getProperties,
  getProperty,
  getPropertyBySlugAdmin,
  updateProperty,
  deleteProperty,
  deletePropertyImage,
} from '../controllers/propertyController';
import { authenticate, authorize } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All routes require admin role
router.use(authorize('admin'));

// Create property (with file upload)
router.post('/', uploadMultiple, createProperty);

// Get all properties
router.get('/', getProperties);

// Get by slug (admin only; no published filter – for previewing drafts)
router.get('/by-slug/:slug', getPropertyBySlugAdmin);

// Get single property by id
router.get('/:id', getProperty);

// Update property (with file upload)
router.put('/:id', uploadMultiple, updateProperty);

// Delete property
router.delete('/:id', deleteProperty);

// Delete property image
router.delete('/:id/images/:imageUrl', deletePropertyImage);

export default router;
