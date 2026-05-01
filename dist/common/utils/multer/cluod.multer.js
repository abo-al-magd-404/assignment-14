"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudFileUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const node_crypto_1 = require("node:crypto");
const node_os_1 = require("node:os");
const enums_1 = require("../../enums");
const cloudFileUpload = ({ storageApproach = enums_1.storageApproachEnum.MEMORY, }) => {
    const storage = storageApproach == enums_1.storageApproachEnum.MEMORY
        ? multer_1.default.memoryStorage()
        : multer_1.default.diskStorage({
            destination: function (req, file, callback) {
                callback(null, (0, node_os_1.tmpdir)());
            },
            filename: function (req, file, callback) {
                callback(null, `${(0, node_crypto_1.randomUUID)()}__${file.originalname}`);
            },
        });
    return (0, multer_1.default)({ storage });
};
exports.cloudFileUpload = cloudFileUpload;
