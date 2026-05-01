import {
  generateDecryption,
  generateEncryption,
} from "./../utils/security/encryption.security";
import { compareHash } from "./../utils/security/hash.security";
import { generateHash } from "../utils/security";

export class SecurityService {
  constructor() {}

  generateHash = generateHash;
  compareHash = compareHash;

  generateDecryption = generateDecryption;
  generateEncryption = generateEncryption;
}
