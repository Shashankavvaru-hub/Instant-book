import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

export const updatePhoneNumberService = async (userId, phone) => {
  if (!phone) {
    throw new AppError("Phone number is required", 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { phone },
  });

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
  };
};

export const updateAvatarService = async (userId, file) => {
  if (!file) {
    throw new AppError("No file uploaded", 400);
  }

  const avatarUrl = file.path;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      email: true,
      avatarUrl: true,
    },
  });

  return user;
};