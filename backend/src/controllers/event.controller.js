import { catchAsync } from "../utils/catchAsync.js";
import {
  createEventService,
  getEventsService,
  getEventByIdService,
  getEventSeatsService,
} from "../services/event.service.js";

export const createEvent = catchAsync(async (req, res) => {
  const event = await createEventService(req.body, req.file);

  res.status(201).json({
    success: true,
    event,
  });
});

export const getEvents = catchAsync(async (req, res) => {
  const events = await getEventsService();

  res.status(200).json({
    success: true,
    events,
  });
});

export const getEventById = catchAsync(async (req, res) => {
  const eventId = Number(req.params.id);

  const event = await getEventByIdService(eventId);

  res.status(200).json({
    success: true,
    event,
  });
});

export const getEventSeats = catchAsync(async (req, res) => {
  const eventId = Number(req.params.id);

  const seats = await getEventSeatsService(eventId);
  res.status(200).json({
    success: true,
    seats,
  });
});