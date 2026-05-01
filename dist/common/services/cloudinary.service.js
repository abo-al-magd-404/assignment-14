"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryService = exports.CloudinaryService = void 0;
const cloudinary_1 = require("cloudinary");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const streamifier_1 = __importDefault(require("streamifier"));
const config_1 = require("../../config/config");
const exceptions_1 = require("../exceptions");
const enums_1 = require("../enums");
const axios_1 = __importDefault(require("axios"));
var ObjectCannedACL;
(function (ObjectCannedACL) {
    ObjectCannedACL["private"] = "private";
    ObjectCannedACL["publicRead"] = "public-read";
})(ObjectCannedACL || (ObjectCannedACL = {}));
class CloudinaryService {
    static IMAGE_EXTENSIONS = new Set([
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "bmp",
        "tiff",
        "svg",
        "avif",
        "heic",
    ]);
    static VIDEO_EXTENSIONS = new Set([
        "mp4",
        "mov",
        "avi",
        "mkv",
        "webm",
        "flv",
        "wmv",
        "m4v",
    ]);
    constructor() {
        cloudinary_1.v2.config({
            cloud_name: config_1.CLOUDINARY_CLOUD_NAME,
            api_key: config_1.CLOUDINARY_API_KEY,
            api_secret: config_1.CLOUDINARY_API_SECRET,
        });
    }
    toStorageError(status, key) {
        if (status === 400) {
            return {
                name: "NoSuchKey",
                message: "Invalid asset key or transformation parameters.",
                httpStatusCode: 400,
                Key: key,
            };
        }
        if (status === 401 || status === 403) {
            return {
                name: "AccessDenied",
                message: "Access denied.",
                httpStatusCode: status ?? 403,
                Key: key,
            };
        }
        return {
            name: "NoSuchKey",
            message: "The specified key does not exist.",
            httpStatusCode: status ?? 404,
            Key: key,
        };
    }
    getStorageMetadata(path, originalName) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        const extension = originalName.split(".").pop();
        const folder = `${config_1.APPLICATION_NAME}/${path}`.replace(/\/{2,}/g, "/");
        const publicId = `${(0, node_crypto_1.randomUUID)()}__${nameWithoutExt}`;
        return { folder, publicId, extension };
    }
    getAccessMode(acl) {
        return acl === ObjectCannedACL.private ? "authenticated" : "public";
    }
    resolveResourceType(format) {
        const ext = (format ?? "").toLowerCase();
        if (CloudinaryService.IMAGE_EXTENSIONS.has(ext))
            return "image";
        if (CloudinaryService.VIDEO_EXTENSIONS.has(ext))
            return "video";
        return "raw";
    }
    async resolveDeliveryVariant({ publicId, preferredResourceType, }) {
        const resourceTypes = [
            preferredResourceType,
            ...["image", "video", "raw"].filter((value) => value !== preferredResourceType),
        ];
        const deliveryTypes = [
            "authenticated",
            "upload",
        ];
        for (const resource_type of resourceTypes) {
            for (const type of deliveryTypes) {
                try {
                    await cloudinary_1.v2.api.resource(publicId, { resource_type, type });
                    return { resource_type, type };
                }
                catch (error) {
                    if (error?.http_code === 404)
                        continue;
                }
            }
        }
        throw this.toStorageError(404, publicId);
    }
    async uploadAsset({ storageApproach = enums_1.storageApproachEnum.MEMORY, path = "general", file, Acl = ObjectCannedACL.private, }) {
        const { folder, publicId } = this.getStorageMetadata(path, file.originalname);
        try {
            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                    folder,
                    public_id: publicId,
                    resource_type: "auto",
                    access_mode: this.getAccessMode(Acl),
                }, (error, res) => {
                    if (error || !res)
                        return reject(error);
                    resolve(res);
                });
                if (storageApproach === enums_1.storageApproachEnum.MEMORY) {
                    streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
                }
                else {
                    (0, node_fs_1.createReadStream)(file.path).pipe(uploadStream);
                }
            });
            return { Key: `${result.public_id}.${result.format}` };
        }
        catch (error) {
            throw new exceptions_1.BadRequestException("Fail to upload this asset");
        }
    }
    async uploadLargeAsset({ storageApproach = enums_1.storageApproachEnum.DISK, path = "general", file, Acl = ObjectCannedACL.private, }) {
        const { folder, publicId } = this.getStorageMetadata(path, file.originalname);
        const options = {
            folder,
            public_id: publicId,
            resource_type: "auto",
            chunk_size: 6000000,
            access_mode: this.getAccessMode(Acl),
        };
        try {
            const result = await new Promise((resolve, reject) => {
                if (storageApproach === enums_1.storageApproachEnum.MEMORY) {
                    const uploadStream = cloudinary_1.v2.uploader.upload_chunked_stream(options, (error, res) => {
                        if (error || !res)
                            return reject(error);
                        resolve(res);
                    });
                    streamifier_1.default.createReadStream(file.buffer).pipe(uploadStream);
                }
                else {
                    cloudinary_1.v2.uploader.upload_large(file.path, options, (error, res) => {
                        if (error || !res)
                            return reject(error);
                        resolve(res);
                    });
                }
            });
            return { Key: `${result.public_id}.${result.format}` };
        }
        catch (error) {
            throw new exceptions_1.BadRequestException("Fail to upload this asset");
        }
    }
    async uploadAssets({ uploadApproach = enums_1.uploadApproachEnum.SMALL, storageApproach = enums_1.storageApproachEnum.MEMORY, Bucket, path = "general", files, Acl = ObjectCannedACL.private, ContentType, }) {
        const uploadTasks = files.map((file) => {
            const params = {
                storageApproach,
                path,
                file,
                Acl,
                ContentType,
            };
            if (Bucket) {
                params.Bucket = Bucket;
            }
            return uploadApproach === enums_1.uploadApproachEnum.LARGE
                ? this.uploadLargeAsset(params).then((res) => res.Key)
                : this.uploadAsset(params).then((res) => res.Key);
        });
        return await Promise.all(uploadTasks);
    }
    async uploadFile(params) {
        return this.uploadAsset(params);
    }
    async createPresignedUploadLink({ path = "general", expiresIn = config_1.CLOUDINARY_EXPIRES_IN, ContentType, Originalname, }) {
        const { folder, publicId, extension } = this.getStorageMetadata(path, Originalname);
        const fullPublicId = `${folder}/${publicId}`;
        const timestamp = Math.round(new Date().getTime() / 1000);
        const expiresAt = timestamp + expiresIn;
        const paramsToSign = {
            folder,
            public_id: publicId,
            timestamp: timestamp,
            type: "authenticated",
            expires_at: expiresAt,
        };
        const signature = cloudinary_1.v2.utils.api_sign_request(paramsToSign, config_1.CLOUDINARY_API_SECRET);
        void ContentType;
        const url = `https://api.cloudinary.com/v1_1/${config_1.CLOUDINARY_CLOUD_NAME}/auto/upload?api_key=${config_1.CLOUDINARY_API_KEY}&timestamp=${timestamp}&expires_at=${expiresAt}&type=authenticated&signature=${signature}&folder=${encodeURIComponent(folder)}&public_id=${encodeURIComponent(publicId)}`;
        return {
            url,
            key: `${fullPublicId}.${extension}`,
        };
    }
    async createPresignedFetchLink({ Key, expiresIn = config_1.CLOUDINARY_EXPIRES_IN, download, fileName, }) {
        const lastDotIndex = Key.lastIndexOf(".");
        const hasExtension = lastDotIndex > 0 && lastDotIndex < Key.length - 1;
        const publicId = hasExtension ? Key.slice(0, lastDotIndex) : Key;
        const format = hasExtension ? Key.slice(lastDotIndex + 1) : undefined;
        const resourceType = this.resolveResourceType(format);
        const expiresAt = Math.round(Date.now() / 1000) + expiresIn;
        const deliveryVariant = await this.resolveDeliveryVariant({
            publicId,
            preferredResourceType: resourceType,
        });
        const finalFileName = fileName || Key.split("/").pop();
        return cloudinary_1.v2.url(publicId, {
            sign_url: true,
            secure: true,
            type: deliveryVariant.type,
            resource_type: deliveryVariant.resource_type,
            ...(format ? { format } : {}),
            expires_at: expiresAt,
            ...(download === "true"
                ? {
                    flags: "attachment",
                    raw_convert: `attachment; filename="${finalFileName}"`,
                }
                : {}),
        });
    }
    async getAsset({ key }) {
        const lastDotIndex = key.lastIndexOf(".");
        const hasExtension = lastDotIndex > 0 && lastDotIndex < key.length - 1;
        const publicId = hasExtension ? key.slice(0, lastDotIndex) : key;
        const format = hasExtension ? key.slice(lastDotIndex + 1) : undefined;
        if (!format) {
            throw this.toStorageError(400, key);
        }
        const expires_at = Math.floor(Date.now() / 1000) + 60;
        const resourceTypes = [
            "image",
            "raw",
            "video",
        ];
        const deliveryTypes = [
            "authenticated",
            "upload",
        ];
        let lastStatus = 404;
        for (const resource_type of resourceTypes) {
            for (const type of deliveryTypes) {
                const signedDownloadUrl = cloudinary_1.v2.utils.private_download_url(publicId, format, {
                    resource_type,
                    type,
                    expires_at,
                });
                try {
                    const response = await axios_1.default.get(signedDownloadUrl, {
                        responseType: "stream",
                    });
                    return {
                        body: response.data,
                        ContentType: response.headers?.["content-type"] ??
                            undefined,
                    };
                }
                catch (error) {
                    const status = typeof error?.response?.status === "number"
                        ? error.response.status
                        : undefined;
                    if (status && status !== 404) {
                        throw this.toStorageError(status, key);
                    }
                    lastStatus = status ?? lastStatus;
                }
            }
        }
        throw this.toStorageError(lastStatus, key);
    }
    async deleteAsset({ Key, }) {
        const lastDotIndex = Key.lastIndexOf(".");
        const hasExtension = lastDotIndex > 0 && lastDotIndex < Key.length - 1;
        const publicId = hasExtension ? Key.slice(0, lastDotIndex) : Key;
        const format = hasExtension ? Key.slice(lastDotIndex + 1) : undefined;
        const preferredResourceType = this.resolveResourceType(format);
        const resourceTypes = [
            preferredResourceType,
            ...["image", "video", "raw"].filter((value) => value !== preferredResourceType),
        ];
        try {
            for (const resource_type of resourceTypes) {
                const result = await cloudinary_1.v2.uploader.destroy(publicId, {
                    resource_type,
                    invalidate: true,
                });
                if (result.result === "ok") {
                    return result;
                }
            }
            return { result: "not_found" };
        }
        catch (error) {
            throw this.toStorageError(error?.http_code, Key);
        }
    }
    async deleteAssets({ Keys, Bucket, }) {
        void Bucket;
        return Promise.all(Keys.map((Key) => this.deleteAsset({ Key })));
    }
}
exports.CloudinaryService = CloudinaryService;
exports.cloudinaryService = new CloudinaryService();
