import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import streamifier from "streamifier";
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  APPLICATION_NAME,
  CLOUDINARY_EXPIRES_IN,
} from "../../config/config";
import { BadRequestException } from "../exceptions";
import { storageApproachEnum, uploadApproachEnum } from "../enums";
import axios from "axios";
import type {
  AssetStorage,
  StorageError,
  StorageGetAssetResult,
} from "../interfaces";

// To match S3 Canned ACL naming convention
enum ObjectCannedACL {
  private = "private",
  publicRead = "public-read",
}

export class CloudinaryService {
  private static readonly IMAGE_EXTENSIONS = new Set([
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

  private static readonly VIDEO_EXTENSIONS = new Set([
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
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
  }

  private toStorageError(
    status: number | undefined,
    key: string,
  ): StorageError {
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

  /**
   * Cloudinary's "Public ID" acts like S3's "Key".
   * To match your S3 logic: {APPLICATION_NAME}/{path}/{uuid}__{filename}
   */
  private getStorageMetadata(path: string, originalName: string) {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const extension = originalName.split(".").pop();
    const folder = `${APPLICATION_NAME}/${path}`.replace(/\/{2,}/g, "/");
    const publicId = `${randomUUID()}__${nameWithoutExt}`;
    return { folder, publicId, extension };
  }

  private getAccessMode(acl: ObjectCannedACL): "authenticated" | "public" {
    return acl === ObjectCannedACL.private ? "authenticated" : "public";
  }

  private resolveResourceType(format?: string): "image" | "video" | "raw" {
    const ext = (format ?? "").toLowerCase();
    if (CloudinaryService.IMAGE_EXTENSIONS.has(ext)) return "image";
    if (CloudinaryService.VIDEO_EXTENSIONS.has(ext)) return "video";
    return "raw";
  }

  private async resolveDeliveryVariant({
    publicId,
    preferredResourceType,
  }: {
    publicId: string;
    preferredResourceType: "image" | "video" | "raw";
  }): Promise<{
    resource_type: "image" | "video" | "raw";
    type: "authenticated" | "upload";
  }> {
    const resourceTypes: Array<"image" | "video" | "raw"> = [
      preferredResourceType,
      ...(["image", "video", "raw"] as const).filter(
        (value) => value !== preferredResourceType,
      ),
    ];
    const deliveryTypes: Array<"authenticated" | "upload"> = [
      "authenticated",
      "upload",
    ];

    for (const resource_type of resourceTypes) {
      for (const type of deliveryTypes) {
        try {
          await cloudinary.api.resource(publicId, { resource_type, type });
          return { resource_type, type };
        } catch (error: any) {
          if (error?.http_code === 404) continue;
        }
      }
    }

    throw this.toStorageError(404, publicId);
  }

  // ===== UPLOAD SINGLE ASSET =====
  async uploadAsset({
    storageApproach = storageApproachEnum.MEMORY,
    path = "general",
    file,
    Acl = ObjectCannedACL.private,
  }: {
    storageApproach?: storageApproachEnum;
    Bucket?: string; // Kept for interface parity, Cloudinary uses Cloud Name
    path?: string;
    file: Express.Multer.File;
    Acl?: ObjectCannedACL;
    ContentType?: string | undefined;
  }): Promise<{ Key: string }> {
    const { folder, publicId } = this.getStorageMetadata(path, file.originalname);

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: publicId,
            resource_type: "auto",
            access_mode: this.getAccessMode(Acl),
          },
          (error, res) => {
            if (error || !res) return reject(error);
            resolve(res);
          },
        );

        if (storageApproach === storageApproachEnum.MEMORY) {
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        } else {
          createReadStream(file.path).pipe(uploadStream);
        }
      });

      return { Key: `${result.public_id}.${result.format}` };
    } catch (error) {
      throw new BadRequestException("Fail to upload this asset");
    }
  }

  // ===== UPLOAD LARGE ASSET =====
  // Returns result containing .Key to match S3's CompleteMultipartUploadCommandOutput structure
  async uploadLargeAsset({
    storageApproach = storageApproachEnum.DISK,
    path = "general",
    file,
    Acl = ObjectCannedACL.private,
  }: {
    storageApproach?: storageApproachEnum;
    Bucket?: string;
    path?: string;
    file: Express.Multer.File;
    Acl?: ObjectCannedACL;
    ContentType?: string | undefined;
  }): Promise<{ Key: string }> {
    const { folder, publicId } = this.getStorageMetadata(path, file.originalname);

    const options = {
      folder,
      public_id: publicId,
      resource_type: "auto" as const,
      chunk_size: 6000000,
      access_mode: this.getAccessMode(Acl),
    };

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        if (storageApproach === storageApproachEnum.MEMORY) {
          const uploadStream = cloudinary.uploader.upload_chunked_stream(
            options,
            (error, res) => {
              if (error || !res) return reject(error);
              resolve(res);
            },
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        } else {
          cloudinary.uploader.upload_large(file.path, options, (error, res) => {
            if (error || !res) return reject(error);
            resolve(res);
          });
        }
      });

      return { Key: `${result.public_id}.${result.format}` };
    } catch (error) {
      throw new BadRequestException("Fail to upload this asset");
    }
  }

  // ===== UPLOAD MULTIPLE ASSETS =====
  async uploadAssets({
    uploadApproach = uploadApproachEnum.SMALL,
    storageApproach = storageApproachEnum.MEMORY,
    Bucket,
    path = "general",
    files,
    Acl = ObjectCannedACL.private,
    ContentType,
  }: {
    uploadApproach?: uploadApproachEnum;
    storageApproach?: storageApproachEnum;
    Bucket?: string;
    path?: string;
    files: Express.Multer.File[];
    Acl?: ObjectCannedACL;
    ContentType?: string | undefined;
  }): Promise<string[]> {
    const uploadTasks = files.map((file) => {
      const params: {
        storageApproach?: storageApproachEnum;
        path?: string;
        file: Express.Multer.File;
        Acl?: ObjectCannedACL;
        ContentType?: string | undefined;
        Bucket?: string;
      } = {
        storageApproach,
        path,
        file,
        Acl,
        ContentType,
      };

      if (Bucket) {
        params.Bucket = Bucket;
      }

      return uploadApproach === uploadApproachEnum.LARGE
        ? this.uploadLargeAsset(params).then((res) => res.Key)
        : this.uploadAsset(params).then((res) => res.Key);
    });

    return await Promise.all(uploadTasks);
  }

  // Alias to be strategy-compatible with S3 naming in codebase
  async uploadFile(params: Parameters<CloudinaryService["uploadAsset"]>[0]) {
    return this.uploadAsset(params);
  }

  // ===== CREATE PRESIGNED UPLOAD LINK =====
  async createPresignedUploadLink({
    path = "general",
    expiresIn = CLOUDINARY_EXPIRES_IN,
    ContentType,
    Originalname,
  }: {
    Bucket?: string;
    path?: string;
    expiresIn?: number;
    ContentType?: string | undefined;
    Originalname: string;
  }): Promise<{ url: string; key: string }> {
    const { folder, publicId, extension } = this.getStorageMetadata(
      path,
      Originalname,
    );
    const fullPublicId = `${folder}/${publicId}`;
    const timestamp = Math.round(new Date().getTime() / 1000);
    const expiresAt = timestamp + expiresIn;

    // Cloudinary requires signature for signed uploads
    const paramsToSign = {
      folder,
      public_id: publicId,
      timestamp: timestamp,
      type: "authenticated",
      expires_at: expiresAt,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      CLOUDINARY_API_SECRET,
    );

    // ContentType is intentionally not embedded here; frontend sends it as multipart/form-data
    // (kept in params for interface parity with S3).
    void ContentType;

    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload?api_key=${CLOUDINARY_API_KEY}&timestamp=${timestamp}&expires_at=${expiresAt}&type=authenticated&signature=${signature}&folder=${encodeURIComponent(folder)}&public_id=${encodeURIComponent(publicId)}`;

    return {
      url,
      key: `${fullPublicId}.${extension}`,
    };
  }

  // ===== CREATE PRESIGNED FETCH LINK (The S3-Way Roots) =====
  async createPresignedFetchLink({
    Key,
    expiresIn = CLOUDINARY_EXPIRES_IN,
    download,
    fileName,
  }: {
    Key: string;
    expiresIn?: number;
    fileName?: string;
    download?: string;
  }): Promise<string> {
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

    return cloudinary.url(publicId, {
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

  // ===== GET ASSET (S3 GET OBJECT MATCH) =====
  // common/services/cloudinary.service.ts

  async getAsset({ key }: { key: string }): Promise<StorageGetAssetResult> {
    const lastDotIndex = key.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0 && lastDotIndex < key.length - 1;
    const publicId = hasExtension ? key.slice(0, lastDotIndex) : key;
    const format = hasExtension ? key.slice(lastDotIndex + 1) : undefined;

    if (!format) {
      throw this.toStorageError(400, key);
    }

    const expires_at = Math.floor(Date.now() / 1000) + 60;
    const resourceTypes: Array<"image" | "raw" | "video"> = [
      "image",
      "raw",
      "video",
    ];
    const deliveryTypes: Array<"authenticated" | "upload"> = [
      "authenticated",
      "upload",
    ];

    let lastStatus: number | undefined = 404;

    for (const resource_type of resourceTypes) {
      for (const type of deliveryTypes) {
        const signedDownloadUrl = cloudinary.utils.private_download_url(
          publicId,
          format,
          {
            resource_type,
            type,
            expires_at,
          },
        );

        try {
          const response = await axios.get(signedDownloadUrl, {
            responseType: "stream",
          });
          return {
            body: response.data as NodeJS.ReadableStream,
            ContentType:
              (response.headers?.["content-type"] as string | undefined) ??
              undefined,
          };
        } catch (error: any) {
          const status =
            typeof error?.response?.status === "number"
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

  // ===== DELETE ASSET (S3 DELETE OBJECT MATCH) =====
  async deleteAsset({
    Key,
  }: {
    Key: string;
    Bucket?: string;
  }): Promise<any> {
    const lastDotIndex = Key.lastIndexOf(".");
    const hasExtension = lastDotIndex > 0 && lastDotIndex < Key.length - 1;
    const publicId = hasExtension ? Key.slice(0, lastDotIndex) : Key;
    const format = hasExtension ? Key.slice(lastDotIndex + 1) : undefined;

    const preferredResourceType = this.resolveResourceType(format);
    const resourceTypes: Array<"image" | "video" | "raw"> = [
      preferredResourceType,
      ...(["image", "video", "raw"] as const).filter(
        (value) => value !== preferredResourceType,
      ),
    ];

    try {
      for (const resource_type of resourceTypes) {
        const result = await cloudinary.uploader.destroy(publicId, {
          resource_type,
          invalidate: true,
        });

        if (result.result === "ok") {
          return result;
        }
      }

      return { result: "not_found" };
    } catch (error: any) {
      throw this.toStorageError(error?.http_code, Key);
    }
  }

  async deleteAssets({
    Keys,
    Bucket,
  }: {
    Keys: string[];
    Bucket?: string;
  }): Promise<any> {
    void Bucket;
    return Promise.all(Keys.map((Key) => this.deleteAsset({ Key })));
  }
}

export const cloudinaryService: AssetStorage =
  new CloudinaryService() as unknown as AssetStorage;
