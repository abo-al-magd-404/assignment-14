"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDecryption = exports.generateEncryption = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const config_js_1 = require("../../../config/config.js");
const domain_exception_js_1 = require("../../exceptions/domain.exception.js");
const generateEncryption = async (plaintext) => {
    const iv = node_crypto_1.default.randomBytes(config_js_1.ENC_IV_LENGTH);
    const cipherIvVector = node_crypto_1.default.createCipheriv("aes-256-cbc", config_js_1.ENC_KEY, iv);
    let cipherText = cipherIvVector.update(plaintext, "utf-8", "hex");
    cipherText += cipherIvVector.final("hex");
    return `${iv.toString("hex")}:${cipherText}`;
};
exports.generateEncryption = generateEncryption;
const generateDecryption = async (cipherText) => {
    const [iv, encryption] = cipherText.split(":") || [];
    if (!iv || !encryption) {
        throw new domain_exception_js_1.BadRequestException("invalid encryption parts");
    }
    const ivLikeBinary = Buffer.from(iv, "hex");
    console.log({ iv, ivLikeBinary, encryption });
    const deCipherIvVector = node_crypto_1.default.createDecipheriv("aes-256-cbc", config_js_1.ENC_KEY, ivLikeBinary);
    let plaintext = deCipherIvVector.update(encryption, "hex", "utf-8");
    plaintext += deCipherIvVector.final("utf-8");
    return plaintext;
};
exports.generateDecryption = generateDecryption;
