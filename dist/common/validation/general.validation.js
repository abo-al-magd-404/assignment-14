"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalValidationFields = void 0;
const zod_1 = require("zod");
exports.generalValidationFields = {
    email: zod_1.z.email(),
    password: zod_1.z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\w).{8,16}$/, {
        error: "weak password",
    }),
    phone: zod_1.z
        .string({ error: "phone is required" })
        .regex(/^(00201|\+201|01)(0|1|2|5)\d{8}$/),
    otp: zod_1.z
        .string({ error: "otp is required" })
        .regex(/^\d{6}$/),
    username: zod_1.z
        .string({ error: "username is mandatory" })
        .min(2, { error: "min is 2 char" })
        .max(25, { error: "max is 25 char" }),
    confirmPassword: zod_1.z.string(),
};
