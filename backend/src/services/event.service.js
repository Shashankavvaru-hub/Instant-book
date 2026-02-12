import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const createEventService = async (data, file) => {
  const { title, description, language, category, startTime, endTime } = data;

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start) || isNaN(end)) {
    throw new AppError("Invalid date format", 400);
  }

  if (start >= end) {
    throw new AppError("startTime must be before endTime", 400);
  }

  const imageUrl = file ? file.path : null;

  const event = await prisma.event.create({
    data: {
      title,
      description,
      language,
      category,
      startTime: start,
      endTime: end,
      imageUrl,
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      startTime: true,
      endTime: true,
      language: true,
      category: true,
    },
  });

  return event;
};

export const getEventsService = async () => {
  return await prisma.event.findMany({
    orderBy: { startTime: "asc" },
  });
};

export const getEventByIdService = async (eventId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError("Event not found", 404);
  }

  return event;
};
