"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadApproachEnum = exports.storageApproachEnum = void 0;
var storageApproachEnum;
(function (storageApproachEnum) {
    storageApproachEnum[storageApproachEnum["MEMORY"] = 0] = "MEMORY";
    storageApproachEnum[storageApproachEnum["DISK"] = 1] = "DISK";
})(storageApproachEnum || (exports.storageApproachEnum = storageApproachEnum = {}));
var uploadApproachEnum;
(function (uploadApproachEnum) {
    uploadApproachEnum[uploadApproachEnum["SMALL"] = 0] = "SMALL";
    uploadApproachEnum[uploadApproachEnum["LARGE"] = 1] = "LARGE";
})(uploadApproachEnum || (exports.uploadApproachEnum = uploadApproachEnum = {}));
