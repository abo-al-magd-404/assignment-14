"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileFilter = exports.fileFieldValidation = void 0;
const exceptions_1 = require("../../exceptions");
exports.fileFieldValidation = {
    image: ["image/jpeg", "image/jpg", "image/png"],
    video: ["video/mp4"],
};
const fileFilter = (validation) => {
    return function (req, file, cb) {
        console.log(file.mimetype);
        if (!validation.includes(file.mimetype)) {
            return cb(new exceptions_1.BadRequestException("Invalid File Format"));
        }
        return cb(null, true);
    };
};
exports.fileFilter = fileFilter;
