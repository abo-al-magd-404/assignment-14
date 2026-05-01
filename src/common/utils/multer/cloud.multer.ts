import type { Request } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { storageApproachEnum } from "../../enums";
import { fileFilter } from "./validation.multer";

export const cloudFileUpload = ({
  storageApproach = storageApproachEnum.MEMORY,
  validation = [],
  maxSize = 10,
  // maxSize = 2,
}: {
  storageApproach?: storageApproachEnum;
  validation?: string[];
  maxSize?: number;
}) => {
  const storage =
    storageApproach == storageApproachEnum.MEMORY
      ? multer.memoryStorage()
      : multer.diskStorage({
          destination: function (
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            callback(null, tmpdir());
          },
          filename: function (
            req: Request,
            file: Express.Multer.File,
            callback: (error: Error | null, destination: string) => void,
          ) {
            callback(null, `${randomUUID()}__${file.originalname}`);
          },
        });

  return multer({
    fileFilter: fileFilter(validation),
    storage,
    limits: { fileSize: maxSize * 1024 * 1024 },
  });
};
