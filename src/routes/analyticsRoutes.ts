import express from 'express';
import {
  trackPageView,
  getDashboardStats,
  getTimeSeriesData,
  getRealTimeAnalytics,
  getPropertyAnalytics,
  exportAnalytics,
} from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/analytics/track:
 *   post:
 *     summary: Track a page view
 *     tags: [Analytics]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - visitorId
 *               - page
 *             properties:
 *               sessionId:
 *                 type: string
 *               visitorId:
 *                 type: string
 *               page:
 *                 type: string
 *               referrer:
 *                 type: string
 *               propertyId:
 *                 type: string
 *               propertySlug:
 *                 type: string
 *               duration:
 *                 type: number
 *               device:
 *                 type: string
 *                 enum: [mobile, tablet, desktop]
 *               browser:
 *                 type: string
 *               os:
 *                 type: string
 *               country:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       201:
 *         description: Page view tracked successfully
 */
router.post('/track', trackPageView);

/**
 * @swagger
 * /api/analytics/dashboard:
 *   get:
 *     summary: Get dashboard analytics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 */
router.get('/dashboard', authenticate, authorize('admin'), getDashboardStats);

/**
 * @swagger
 * /api/analytics/timeseries:
 *   get:
 *     summary: Get time series data for charts
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, 90d]
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [visits, uniqueVisitors]
 *     responses:
 *       200:
 *         description: Time series data retrieved successfully
 */
router.get('/timeseries', authenticate, authorize('admin'), getTimeSeriesData);

/**
 * @swagger
 * /api/analytics/realtime:
 *   get:
 *     summary: Get real-time analytics (last 30 minutes)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Real-time analytics retrieved successfully
 */
router.get('/realtime', authenticate, authorize('admin'), getRealTimeAnalytics);

/**
 * @swagger
 * /api/analytics/property/{propertyId}:
 *   get:
 *     summary: Get analytics for a specific property
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d]
 *     responses:
 *       200:
 *         description: Property analytics retrieved successfully
 */
router.get('/property/:propertyId', authenticate, authorize('admin'), getPropertyAnalytics);

/**
 * @swagger
 * /api/analytics/export:
 *   get:
 *     summary: Export analytics data
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *     responses:
 *       200:
 *         description: Analytics data exported successfully
 */
router.get('/export', authenticate, authorize('admin'), exportAnalytics);

export default router;
