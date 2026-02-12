import { catchAsync } from "../utils/catchAsync.js";
import {
  updatePhoneNumberService,
  updateAvatarService,
} from "../services/user.service.js";

export const updatePhoneNumber = catchAsync(async (req, res) => {
  const user = await updatePhoneNumberService(req.user.id, req.body.phone);

  res.status(200).json({
    success: true,
    user,
  });
});

export const updateAvatar = catchAsync(async (req, res) => {
  const user = await updateAvatarService(req.user.id, req.file);

  res.status(200).json({
    success: true,
    user,
  });
});