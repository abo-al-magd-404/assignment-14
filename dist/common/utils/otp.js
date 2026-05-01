"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRandomOtp = void 0;
const createRandomOtp = () => {
    return Math.floor(Math.random() * 900000 + 100000);
};
exports.createRandomOtp = createRandomOtp;
