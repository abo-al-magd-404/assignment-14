"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWS_EXPIRES_IN = exports.AWS_BUCKET_NAME = exports.AWS_SECRET_KEY = exports.AWS_ACCESS_KEY_ID = exports.AWS_REGION = exports.CLOUDINARY_EXPIRES_IN = exports.CLOUDINARY_API_SECRET = exports.CLOUDINARY_API_KEY = exports.CLOUDINARY_CLOUD_NAME = exports.CLIENT_IDS = exports.ORIGINS = exports.TWITTER = exports.INSTAGRAM = exports.FACEBOOK = exports.APPLICATION_NAME = exports.EMAIL_APP_PASSWORD = exports.EMAIL_APP = exports.REFRESH_EXPIRES_IN = exports.ACCESS_EXPIRES_IN = exports.SYSTEM_REFRESH_TOKEN_SIGNATURE = exports.SYSTEM_ACCESS_TOKEN_SIGNATURE = exports.USER_REFRESH_TOKEN_SIGNATURE = exports.USER_ACCESS_TOKEN_SIGNATURE = exports.ENC_KEY = exports.ENC_IV_LENGTH = exports.SALT_ROUND = exports.REDIS_URL = exports.DB_URI = exports.PORT = void 0;
const node_path_1 = require("node:path");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, node_path_1.resolve)(`./.env.${process.env.NODE_ENV}`) });
exports.PORT = process.env.PORT || 30000;
exports.DB_URI = process.env.DB_URI;
exports.REDIS_URL = process.env.REDIS_URL;
exports.SALT_ROUND = parseInt(process.env.SALT_ROUND ?? "12");
exports.ENC_IV_LENGTH = parseInt(process.env.ENC_IV_LENGTH ?? "16");
exports.ENC_KEY = process.env.ENC_KEY;
exports.USER_ACCESS_TOKEN_SIGNATURE = process.env
    .USER_ACCESS_TOKEN_SIGNATURE;
exports.USER_REFRESH_TOKEN_SIGNATURE = process.env
    .USER_REFRESH_TOKEN_SIGNATURE;
exports.SYSTEM_ACCESS_TOKEN_SIGNATURE = process.env
    .SYSTEM_ACCESS_TOKEN_SIGNATURE;
exports.SYSTEM_REFRESH_TOKEN_SIGNATURE = process.env
    .SYSTEM_REFRESH_TOKEN_SIGNATURE;
exports.ACCESS_EXPIRES_IN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1800");
exports.REFRESH_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "31536000");
exports.EMAIL_APP = process.env.APP_EMAIL;
exports.EMAIL_APP_PASSWORD = process.env.APP_EMAIL_PASSWORD;
exports.APPLICATION_NAME = process.env.APPLICATION_NAME;
exports.FACEBOOK = process.env.FACEBOOK;
exports.INSTAGRAM = process.env.INSTAGRAM;
exports.TWITTER = process.env.TWITTER;
exports.ORIGINS = process.env.ORIGINS?.split(",") || [];
exports.CLIENT_IDS = process.env.CLIENT_IDS?.split(",") || [];
exports.CLOUDINARY_CLOUD_NAME = process.env
    .CLOUDINARY_CLOUD_NAME;
exports.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
exports.CLOUDINARY_API_SECRET = process.env
    .CLOUDINARY_API_SECRET;
exports.CLOUDINARY_EXPIRES_IN = parseInt(process.env.CLOUDINARY_EXPIRES_IN ?? "120");
exports.AWS_REGION = process.env.AWS_REGION;
exports.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
exports.AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
exports.AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
exports.AWS_EXPIRES_IN = parseInt(process.env.AWS_EXPIRES_IN ?? "3600");
