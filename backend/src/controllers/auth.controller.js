import { catchAsync } from "../utils/catchAsync.js";
import { signupService, loginService } from "../services/auth.service.js";

const isProduction = process.env.NODE_ENV === "production";

// const cookieOptions = {
//   httpOnly: true,
//   sameSite: isProduction ? "none" : "lax",
//   secure: isProduction,
//   maxAge: 7 * 24 * 60 * 60 * 1000,
// };

res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
});

export const signup = catchAsync(async (req, res) => {
  const result = await signupService(req.body);

  res.cookie("token", result.token, cookieOptions);

  res.status(201).json({
    success: true,
    user: result.user,
  });
});

export const login = catchAsync(async (req, res) => {
  const result = await loginService(req.body);

  res.cookie("token", result.token, cookieOptions);

  res.status(200).json({
    success: true,
    user: result.user,
  });
});

export const logout = (req, res) => {
  res.clearCookie("token", cookieOptions);
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const me = (req, res) => {
  res.status(200).json({
    authenticated: true,
    user: req.user,
  });
};