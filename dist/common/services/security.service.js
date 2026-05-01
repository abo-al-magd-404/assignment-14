"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const encryption_security_1 = require("./../utils/security/encryption.security");
const hash_security_1 = require("./../utils/security/hash.security");
const security_1 = require("../utils/security");
class SecurityService {
    constructor() { }
    generateHash = security_1.generateHash;
    compareHash = hash_security_1.compareHash;
    generateDecryption = encryption_security_1.generateDecryption;
    generateEncryption = encryption_security_1.generateEncryption;
}
exports.SecurityService = SecurityService;
