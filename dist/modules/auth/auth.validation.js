"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgetPassword = exports.signup = exports.login = exports.confirmEmail = exports.resendConfirmEmail = void 0;
const zod_1 = require("zod");
const validation_1 = require("../../common/validation");
exports.resendConfirmEmail = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
    }),
};
exports.confirmEmail = {
    body: exports.resendConfirmEmail.body.safeExtend({
        otp: validation_1.generalValidationFields.otp,
    }),
};
exports.login = {
    body: exports.resendConfirmEmail.body.safeExtend({
        password: validation_1.generalValidationFields.password,
    }),
};
exports.signup = {
    body: exports.login.body
        .safeExtend({
        username: validation_1.generalValidationFields.username,
        phone: validation_1.generalValidationFields.phone.optional(),
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: "Password mismatch with confirm password",
        path: ["confirmPassword"],
    }),
};
exports.forgetPassword = {
    body: zod_1.z.strictObject({
        email: validation_1.generalValidationFields.email,
    }),
};
exports.resetPassword = {
    body: zod_1.z
        .strictObject({
        email: validation_1.generalValidationFields.email,
        otp: validation_1.generalValidationFields.otp,
        password: validation_1.generalValidationFields.password,
        confirmPassword: validation_1.generalValidationFields.confirmPassword,
    })
        .refine((data) => data.password === data.confirmPassword, {
        message: "Password mismatch with confirm password",
        path: ["confirmPassword"],
    }),
};
