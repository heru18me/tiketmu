import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { dashboardStatsQuerySchema } from '../validators/dashboard.validator';
import { sendSuccess } from '../utils/response';

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = dashboardStatsQuerySchema.parse(req.query);
    sendSuccess(
      res,
      await dashboardService.getDashboardStats(req.user!.userId, year),
      'Dashboard stats retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export const getAttendeeList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(
      res,
      await dashboardService.getAttendeeList(req.params.eventId, req.user!.userId),
      'Attendees retrieved'
    );
  } catch (error) {
    next(error);
  }
};
