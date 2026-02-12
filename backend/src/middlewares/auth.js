import { verifyToken } from "../utils/jwt.js";
import { AppError } from "../utils/AppError.js";
import { prisma } from "../config/prisma.js";

export const protect = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return next(new AppError("Not authenticated", 401));

  const decoded = await verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      email: true,
      role: true,
      avatarUrl: true,
      isVerified: true,
    },
  });
  if (!user) return next(new AppError("User not found", 401));

  req.user = user;

  next();
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

