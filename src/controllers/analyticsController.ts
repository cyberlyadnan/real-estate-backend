import { Request, Response } from 'express';
import { PageView } from '../models/Analytics';
import Property from '../models/Property';
import Lead from '../models/Lead';
import { subDays } from 'date-fns';

// Track a page view
export const trackPageView = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sessionId,
      visitorId,
      page,
      referrer,
      propertyId,
      propertySlug,
      duration,
      device,
      browser,
      os,
      country,
      city,
    } = req.body;

    // Check if this is a unique visitor (first time visiting)
    const existingVisitor = await PageView.findOne({ visitorId });
    const isUnique = !existingVisitor;
    const isReturning = !!existingVisitor;

    // Get IP and User Agent from request
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const pageView = await PageView.create({
      sessionId,
      visitorId,
      ipAddress,
      userAgent,
      page,
      referrer,
      propertyId,
      propertySlug,
      duration,
      device,
      browser,
      os,
      country,
      city,
      isUnique,
      isReturning,
    });

    // Update property view count if applicable
    if (propertyId) {
      await Property.findByIdAndUpdate(propertyId, { $inc: { views: 1 } });
    }

    res.status(201).json({
      success: true,
      data: pageView,
    });
  } catch (error: any) {
    console.error('Error tracking page view:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to track page view',
    });
  }
};

// Get dashboard overview stats
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate: Date;
    const endDate = new Date();

    // Determine date range based on period
    switch (period) {
      case '24h':
        startDate = subDays(endDate, 1);
        break;
      case '7d':
        startDate = subDays(endDate, 7);
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 7);
    }

    // Get page views in the period
    const pageViews = await PageView.find({
      createdAt: { $gte: startDate, $lte: endDate },
    });

    // Calculate metrics
    const totalVisits = pageViews.length;
    const uniqueVisitors = new Set(pageViews.map(pv => pv.visitorId)).size;
    const returningVisitors = pageViews.filter(pv => pv.isReturning).length;
    
    // Device breakdown
    const deviceBreakdown = {
      mobile: pageViews.filter(pv => pv.device === 'mobile').length,
      tablet: pageViews.filter(pv => pv.device === 'tablet').length,
      desktop: pageViews.filter(pv => pv.device === 'desktop').length,
    };

    // Top pages
    const pageCount: { [key: string]: number } = {};
    pageViews.forEach(pv => {
      pageCount[pv.page] = (pageCount[pv.page] || 0) + 1;
    });
    const topPages = Object.entries(pageCount)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Top properties
    const propertyCount: { [key: string]: { id: string; slug: string; views: number } } = {};
    pageViews.forEach(pv => {
      if (pv.propertyId) {
        const key = pv.propertyId.toString();
        if (!propertyCount[key]) {
          propertyCount[key] = { 
            id: key, 
            slug: pv.propertySlug || '', 
            views: 0 
          };
        }
        propertyCount[key].views++;
      }
    });
    
    const topPropertyIds = Object.values(propertyCount)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Fetch property names
    const topProperties = await Promise.all(
      topPropertyIds.map(async (prop) => {
        const property = await Property.findById(prop.id).select('name slug');
        return {
          propertyId: prop.id,
          propertySlug: prop.slug,
          propertyName: property?.name || 'Unknown',
          views: prop.views,
        };
      })
    );

    // Browser breakdown
    const browserCount: { [key: string]: number } = {};
    pageViews.forEach(pv => {
      if (pv.browser) {
        browserCount[pv.browser] = (browserCount[pv.browser] || 0) + 1;
      }
    });
    const browserBreakdown = Object.entries(browserCount)
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top referrers
    const referrerCount: { [key: string]: number } = {};
    pageViews.forEach(pv => {
      if (pv.referrer) {
        referrerCount[pv.referrer] = (referrerCount[pv.referrer] || 0) + 1;
      }
    });
    const topReferrers = Object.entries(referrerCount)
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top countries
    const countryCount: { [key: string]: number } = {};
    pageViews.forEach(pv => {
      if (pv.country) {
        countryCount[pv.country] = (countryCount[pv.country] || 0) + 1;
      }
    });
    const topCountries = Object.entries(countryCount)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average session duration
    const totalDuration = pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0);
    const avgSessionDuration = totalVisits > 0 ? Math.round(totalDuration / totalVisits) : 0;

    // Bounce rate (sessions with only 1 page view)
    const sessionCount: { [key: string]: number } = {};
    pageViews.forEach(pv => {
      sessionCount[pv.sessionId] = (sessionCount[pv.sessionId] || 0) + 1;
    });
    const bouncedSessions = Object.values(sessionCount).filter(count => count === 1).length;
    const totalSessions = Object.keys(sessionCount).length;
    const bounceRate = totalSessions > 0 ? Math.round((bouncedSessions / totalSessions) * 100) : 0;

    // Lead conversions
    const leadConversions = await Lead.countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    const conversionRate = totalVisits > 0 ? ((leadConversions / totalVisits) * 100).toFixed(2) : '0.00';

    res.json({
      success: true,
      data: {
        period,
        dateRange: {
          start: startDate,
          end: endDate,
        },
        overview: {
          totalVisits,
          uniqueVisitors,
          returningVisitors,
          avgSessionDuration,
          bounceRate,
          leadConversions,
          conversionRate: parseFloat(conversionRate),
        },
        deviceBreakdown,
        topPages,
        topProperties,
        browserBreakdown,
        topReferrers,
        topCountries,
      },
    });
  } catch (error: any) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get dashboard stats',
    });
  }
};

// Get time series data for charts
export const getTimeSeriesData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate: Date;
    const endDate = new Date();
    let groupBy: 'hour' | 'day' | 'week' | 'month' = 'day';

    switch (period) {
      case '24h':
        startDate = subDays(endDate, 1);
        groupBy = 'hour';
        break;
      case '7d':
        startDate = subDays(endDate, 7);
        groupBy = 'day';
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        groupBy = 'day';
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        groupBy = 'week';
        break;
      default:
        startDate = subDays(endDate, 7);
        groupBy = 'day';
    }

    let groupFormat: any;

    if (groupBy === 'hour') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' },
      };
    } else if (groupBy === 'day') {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
      };
    } else if (groupBy === 'week') {
      groupFormat = {
        year: { $year: '$createdAt' },
        week: { $week: '$createdAt' },
      };
    } else {
      groupFormat = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
    }

    const pipeline: any[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: groupFormat,
          date: { $first: '$createdAt' },
          visits: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' },
        },
      },
      {
        $project: {
          date: 1,
          visits: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
      { $sort: { date: 1 } },
    ];

    const data = await PageView.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        timeSeries: data.map(item => ({
          date: item.date,
          visits: item.visits,
          uniqueVisitors: item.uniqueVisitors,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error getting time series data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get time series data',
    });
  }
};

// Get real-time analytics (last 30 minutes)
export const getRealTimeAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const recentViews = await PageView.find({
      createdAt: { $gte: thirtyMinutesAgo },
    }).sort({ createdAt: -1 }).limit(100);

    const activeVisitors = new Set(recentViews.map(pv => pv.visitorId)).size;
    const currentPages = recentViews.slice(0, 20).map(pv => ({
      page: pv.page,
      visitorId: pv.visitorId,
      timestamp: pv.createdAt,
      device: pv.device,
      country: pv.country,
    }));

    res.json({
      success: true,
      data: {
        activeVisitors,
        recentPageViews: recentViews.length,
        currentPages,
      },
    });
  } catch (error: any) {
    console.error('Error getting real-time analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get real-time analytics',
    });
  }
};

// Get property-specific analytics
export const getPropertyAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const { period = '30d' } = req.query;

    let startDate: Date;
    const endDate = new Date();

    switch (period) {
      case '7d':
        startDate = subDays(endDate, 7);
        break;
      case '30d':
        startDate = subDays(endDate, 30);
        break;
      case '90d':
        startDate = subDays(endDate, 90);
        break;
      default:
        startDate = subDays(endDate, 30);
    }

    const views = await PageView.find({
      propertyId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const totalViews = views.length;
    const uniqueVisitors = new Set(views.map(v => v.visitorId)).size;
    const avgDuration = views.length > 0 
      ? Math.round(views.reduce((sum, v) => sum + (v.duration || 0), 0) / views.length)
      : 0;

    // Leads generated for this property
    const leads = await Lead.countDocuments({
      propertyId,
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const conversionRate = totalViews > 0 ? ((leads / totalViews) * 100).toFixed(2) : '0.00';

    res.json({
      success: true,
      data: {
        propertyId,
        period,
        totalViews,
        uniqueVisitors,
        avgDuration,
        leads,
        conversionRate: parseFloat(conversionRate),
      },
    });
  } catch (error: any) {
    console.error('Error getting property analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get property analytics',
    });
  }
};

// Export analytics data
export const exportAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const start = startDate ? new Date(startDate as string) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate as string) : new Date();

    const pageViews = await PageView.find({
      createdAt: { $gte: start, $lte: end },
    }).populate('propertyId', 'name slug');

    if (format === 'csv') {
      // Generate CSV
      const csv = [
        'Date,Time,Page,Visitor ID,Device,Browser,Country,Duration,Property',
        ...pageViews.map(pv => 
          `${pv.createdAt.toISOString().split('T')[0]},${pv.createdAt.toISOString().split('T')[1].split('.')[0]},${pv.page},${pv.visitorId},${pv.device},${pv.browser || ''},${pv.country || ''},${pv.duration || 0},${(pv.propertyId as any)?.name || ''}`
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=analytics-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: pageViews,
      });
    }
  } catch (error: any) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export analytics',
    });
  }
};
