import { Router } from "express";
import {
  updatePhoneNumber,
  updateAvatar,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.js";
import { uploadAvatar } from "../config/uploadAvatar.js";
const router = Router();

router.patch("/update-phone", protect, updatePhoneNumber);
router.patch(
  "/upload-avatar",
  protect,
  uploadAvatar.single("avatar"),
  updateAvatar,
);

export default router;
