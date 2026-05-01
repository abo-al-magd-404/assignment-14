import { type Request } from "express";
import { FileFilterCallback } from "multer";
import { BadRequestException } from "../../exceptions";

export const fileFieldValidation = {
  image: ["image/jpeg", "image/jpg", "image/png"],
  video: ["video/mp4"],
};

export const fileFilter = (validation: string[]) => {
  return function (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) {
    console.log(file.mimetype);

    if (!validation.includes(file.mimetype)) {
      return cb(new BadRequestException("Invalid File Format"));
    }

    return cb(null, true);
  };
};
