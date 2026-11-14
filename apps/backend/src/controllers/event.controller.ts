import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/event.service';
import {
  createEventSchema,
  updateEventSchema,
  filterEventSchema,
  organizerEventFilterSchema,
} from '../validators/event.validator';
import { sendSuccess, sendPaginated } from '../utils/response';

// Hapus file upload jika request gagal sebelum sampai ke service
const discardUpload = (file?: Express.Multer.File) => {
  if (file) fs.unlink(file.path, () => undefined);
};

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = filterEventSchema.parse(req.query);
    const { events, meta } = await eventService.getEvents(filters);
    sendPaginated(res, events, 'Events retrieved', meta);
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await eventService.getCategories(), 'Categories retrieved');
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, await eventService.getEventById(req.params.id), 'Event retrieved');
  } catch (error) {
    next(error);
  }
};

export const getOrganizerEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = organizerEventFilterSchema.parse(req.query);
    const { events, meta } = await eventService.getOrganizerEvents(req.user!.userId, filters);
    sendPaginated(res, events, 'Events retrieved', meta);
  } catch (error) {
    next(error);
  }
};

export const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createEventSchema.parse(req.body);
    const event = await eventService.createEvent(req.user!.userId, data, req.file);
    sendSuccess(res, event, 'Event created', 201);
  } catch (error) {
    discardUpload(req.file);
    next(error);
  }
};

export const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateEventSchema.parse(req.body);
    const event = await eventService.updateEvent(req.params.id, req.user!.userId, data, req.file);
    sendSuccess(res, event, 'Event updated');
  } catch (error) {
    discardUpload(req.file);
    next(error);
  }
};

export const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await eventService.deleteEvent(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Event cancelled');
  } catch (error) {
    next(error);
  }
};
