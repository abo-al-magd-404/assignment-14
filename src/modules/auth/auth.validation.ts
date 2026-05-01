import { z } from "zod";
import { generalValidationFields } from "../../common/validation";

// ===== RESEND CONFIRM EMAIL =====
export const resendConfirmEmail = {
  body: z.strictObject({
    email: generalValidationFields.email,
  }),
};

// ===== CONFIRM EMAIL =====
export const confirmEmail = {
  body: resendConfirmEmail.body.safeExtend({
    otp: generalValidationFields.otp,
  }),
};

// ===== LOGIN =====
export const login = {
  body: resendConfirmEmail.body.safeExtend({
    password: generalValidationFields.password,
  }),
};

// ===== SIGNUP =====
export const signup = {
  body: login.body
    .safeExtend({
      username: generalValidationFields.username,
      phone: generalValidationFields.phone.optional(),
      confirmPassword: generalValidationFields.confirmPassword,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Password mismatch with confirm password",
      path: ["confirmPassword"],
    }),
};

// ===== FORGET PASSWORD =====
export const forgetPassword = {
  body: z.strictObject({
    email: generalValidationFields.email,
  }),
};

// ===== RESET PASSWORD =====
export const resetPassword = {
  body: z
    .strictObject({
      email: generalValidationFields.email,
      otp: generalValidationFields.otp,
      password: generalValidationFields.password,
      confirmPassword: generalValidationFields.confirmPassword,
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Password mismatch with confirm password",
      path: ["confirmPassword"],
    }),
};
