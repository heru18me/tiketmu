import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service';
import { createReviewSchema, reviewListQuerySchema } from '../validators/review.validator';
import { sendSuccess, sendPaginated } from '../utils/response';

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReviewSchema.parse(req.body);
    const review = await reviewService.createReview(req.user!.userId, data);
    sendSuccess(res, review, 'Review created', 201);
  } catch (error) {
    next(error);
  }
};

export const getEventReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = reviewListQuerySchema.parse(req.query);
    const { reviews, meta } = await reviewService.getEventReviews(req.params.eventId, query);
    sendPaginated(res, reviews, 'Reviews retrieved', meta);
  } catch (error) {
    next(error);
  }
};
