"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Service = exports.S3Service = void 0;
const node_crypto_1 = require("node:crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const lib_storage_1 = require("@aws-sdk/lib-storage");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const node_fs_1 = require("node:fs");
const config_1 = require("../../config/config");
const exceptions_1 = require("../exceptions");
const enums_1 = require("../enums");
class S3Service {
    client;
    constructor() {
        this.client = new client_s3_1.S3Client({
            region: config_1.AWS_REGION,
            credentials: {
                accessKeyId: config_1.AWS_ACCESS_KEY_ID,
                secretAccessKey: config_1.AWS_SECRET_KEY,
            },
        });
    }
    toStorageError(error, key) {
        const e = error;
        const rawName = (e?.name ?? e?.Code ?? e?.code);
        const name = rawName === "AccessDenied"
            ? "AccessDenied"
            : rawName === "NoSuchKey"
                ? "NoSuchKey"
                : "NoSuchKey";
        const httpStatusCode = typeof e?.$metadata?.httpStatusCode === "number"
            ? e.$metadata.httpStatusCode
            : name === "AccessDenied"
                ? 403
                : 404;
        return name === "AccessDenied"
            ? {
                name: "AccessDenied",
                message: "Access denied.",
                httpStatusCode,
                Key: key,
            }
            : {
                name: "NoSuchKey",
                message: "The specified key does not exist.",
                httpStatusCode,
                Key: key,
            };
    }
    async uploadAsset({ storageApproach = enums_1.storageApproachEnum.MEMORY, Bucket = config_1.AWS_BUCKET_NAME, path = "general", file, Acl = client_s3_1.ObjectCannedACL.private, ContentType, }) {
        const Key = `${config_1.APPLICATION_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${file.originalname}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket,
            Key,
            ACL: Acl,
            Body: storageApproach === enums_1.storageApproachEnum.MEMORY
                ? file.buffer
                : (0, node_fs_1.createReadStream)(file.path),
            ContentType: ContentType || file.mimetype,
        });
        try {
            await this.client.send(command);
            return { Key };
        }
        catch (error) {
            throw new exceptions_1.BadRequestException("Fail to upload this asset");
        }
    }
    async uploadLargeAsset({ storageApproach = enums_1.storageApproachEnum.DISK, Bucket = config_1.AWS_BUCKET_NAME, path = "general", file, Acl = client_s3_1.ObjectCannedACL.private, ContentType, partSize = 5, }) {
        const Key = `${config_1.APPLICATION_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${file.originalname}`;
        const uploadFile = new lib_storage_1.Upload({
            client: this.client,
            params: {
                Bucket,
                Key,
                ACL: Acl,
                Body: storageApproach === enums_1.storageApproachEnum.MEMORY
                    ? file.buffer
                    : (0, node_fs_1.createReadStream)(file.path),
                ContentType: ContentType || file.mimetype,
            },
            partSize: partSize * 1024 * 1024,
        });
        uploadFile.on("httpUploadProgress", (progress) => {
            if (progress.loaded && progress.total) {
                const percentage = Math.round((progress.loaded / progress.total) * 100);
                console.log(`File Upload is ${percentage}%`);
            }
        });
        return (await uploadFile.done());
    }
    async uploadAssets({ uploadApproach = enums_1.uploadApproachEnum.SMALL, storageApproach = enums_1.storageApproachEnum.MEMORY, Bucket = config_1.AWS_BUCKET_NAME, path = "general", files, Acl = client_s3_1.ObjectCannedACL.private, ContentType, }) {
        if (uploadApproach === enums_1.uploadApproachEnum.LARGE) {
            const data = await Promise.all(files.map((file) => this.uploadLargeAsset({
                storageApproach,
                file,
                Acl,
                Bucket,
                ContentType,
                path,
            })));
            return data.map((ele) => ele.Key);
        }
        else {
            const urls = await Promise.all(files.map((file) => this.uploadAsset({
                storageApproach,
                file,
                Acl,
                Bucket,
                ContentType,
                path,
            })));
            return urls.map((ele) => ele.Key);
        }
    }
    async createPresignedUploadLink({ Bucket = config_1.AWS_BUCKET_NAME, path = "general", expiresIn = config_1.AWS_EXPIRES_IN, ContentType, Originalname, }) {
        const Key = `${config_1.APPLICATION_NAME}/${path}/${(0, node_crypto_1.randomUUID)()}__${Originalname}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket,
            Key,
            ContentType,
        });
        if (!command.input?.Key) {
            throw new exceptions_1.BadRequestException("Fail to upload this asset");
        }
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        return { url, key: command.input.Key };
    }
    async createPresignedFetchLink({ Bucket = config_1.AWS_BUCKET_NAME, Key, expiresIn = config_1.AWS_EXPIRES_IN, fileName, download, }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key,
            ResponseContentDisposition: download === "true"
                ? `attachment; filename="${fileName || Key.split("/").pop()}"`
                : undefined,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(this.client, command, { expiresIn });
        return url;
    }
    async getAsset({ Bucket = config_1.AWS_BUCKET_NAME, key, }) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket,
            Key: key,
        });
        try {
            const result = await this.client.send(command);
            return {
                body: result.Body,
                ContentType: result.ContentType,
            };
        }
        catch (error) {
            throw this.toStorageError(error, key);
        }
    }
    async deleteAsset({ Bucket = config_1.AWS_BUCKET_NAME, Key, }) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket,
            Key,
        });
        try {
            return await this.client.send(command);
        }
        catch (error) {
            throw this.toStorageError(error, Key);
        }
    }
    async deleteAssets({ Bucket = config_1.AWS_BUCKET_NAME, Keys, }) {
        return Promise.all(Keys.map((Key) => this.deleteAsset({ Bucket, Key })));
    }
}
exports.S3Service = S3Service;
exports.s3Service = new S3Service();
