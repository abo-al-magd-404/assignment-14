"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupSchema = void 0;
const zod_1 = require("zod");
exports.signupSchema = {
    body: zod_1.z.object({
        username: zod_1.z.string().min(2).max(25),
        email: zod_1.z.email(),
        password: zod_1.z.string(),
    }),
};
