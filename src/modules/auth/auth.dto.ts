import { z } from "zod";
import {
  confirmEmail,
  forgetPassword,
  login,
  resendConfirmEmail,
  resetPassword,
  signup,
} from "./auth.validation";

export type LoginDto = z.infer<typeof login.body>;
export type confirmEmailDto = z.infer<typeof confirmEmail.body>;
export type resendConfirmEmailDto = z.infer<typeof resendConfirmEmail.body>;
export type SignupDto = z.infer<typeof signup.body>;

// password DTOs
export type forgetPasswordDto = z.infer<typeof forgetPassword.body>;
export type resetPasswordDto = z.infer<typeof resetPassword.body>;
