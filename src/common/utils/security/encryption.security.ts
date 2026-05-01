import crypto from "node:crypto";
import { ENC_IV_LENGTH, ENC_KEY } from "../../../config/config.js";
import { BadRequestException } from "../../exceptions/domain.exception.js";

export const generateEncryption = async (
  plaintext: string,
): Promise<string> => {
  const iv = crypto.randomBytes(ENC_IV_LENGTH);
  const cipherIvVector = crypto.createCipheriv("aes-256-cbc", ENC_KEY, iv);
  let cipherText = cipherIvVector.update(plaintext, "utf-8", "hex");
  cipherText += cipherIvVector.final("hex");

  // console.log({ iv, cipherIvVector, cipherText, ivv: iv.toString("hex") });

  return `${iv.toString("hex")}:${cipherText}`;
};

export const generateDecryption = async (
  cipherText: string,
): Promise<string> => {
  const [iv, encryption] = cipherText.split(":") || ([] as string[]);

  if (!iv || !encryption) {
    throw new BadRequestException("invalid encryption parts");
  }

  const ivLikeBinary = Buffer.from(iv, "hex");

  console.log({ iv, ivLikeBinary, encryption });

  const deCipherIvVector = crypto.createDecipheriv(
    "aes-256-cbc",
    ENC_KEY,
    ivLikeBinary,
  );
  let plaintext = deCipherIvVector.update(encryption, "hex", "utf-8");
  plaintext += deCipherIvVector.final("utf-8");

  return plaintext;
};
