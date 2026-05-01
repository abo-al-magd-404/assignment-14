import { z } from "zod";

export const generalValidationFields = {
  email: z.email(),
  password: z
    .string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\w).{8,16}$/, {
      error: "weak password",
    }),
  phone: z
    .string({ error: "phone is required" })
    .regex(/^(00201|\+201|01)(0|1|2|5)\d{8}$/),
  otp: z
    .string({ error: "otp is required" })
    .regex(/^\d{6}$/),
  username: z
    .string({ error: "username is mandatory" })
    .min(2, { error: "min is 2 char" })
    .max(25, { error: "max is 25 char" }),
  confirmPassword: z.string(),
};
