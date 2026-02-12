import { Router } from "express";
import { signup, login,logout,me } from "../controllers/auth.controller.js";
import { validate } from "../middlewares/validate.js";
import { signUpSchema, loginSchema } from "../validators/auth.schema.js";
import { protect } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", validate(signUpSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout",protect, logout);
router.get("/me",protect,me);

export default router;