import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  ObjectCannedACL,
  CompleteMultipartUploadCommandOutput,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createReadStream } from "node:fs";
import {
  APPLICATION_NAME,
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY,
  AWS_BUCKET_NAME,
  AWS_EXPIRES_IN,
} from "../../config/config";
import { BadRequestException } from "../exceptions";
import { storageApproachEnum, uploadApproachEnum } from "../enums";
import type {
  AssetStorage,
  StorageError,
  StorageGetAssetResult,
} from "../interfaces";

export class S3Service {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_KEY,
      },
    });
  }

  private toStorageError(error: unknown, key: string): StorageError {
    const e = error as any;
    const rawName = (e?.name ?? e?.Code ?? e?.code) as unknown;
    const name =
      rawName === "AccessDenied"
        ? "AccessDenied"
        : rawName === "NoSuchKey"
          ? "NoSuchKey"
          : "NoSuchKey";

    const httpStatusCode =
      typeof e?.$metadata?.httpStatusCode === "number"
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

  // ===== UPLOAD SINGLE ASSET =====
  async uploadAsset({
    storageApproach = storageApproachEnum.MEMORY,
    Bucket = AWS_BUCKET_NAME,
    path = "general",
    file,
    Acl = ObjectCannedACL.private,
    ContentType,
  }: {
    storageApproach?: storageApproachEnum;
    Bucket?: string;
    path?: string;
    file: Express.Multer.File;
    Acl?: ObjectCannedACL;
    ContentType?: string | undefined;
  }): Promise<{ Key: string }> {
    const Key = `${APPLICATION_NAME}/${path}/${randomUUID()}__${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket,
      Key,
      ACL: Acl,
      Body:
        storageApproach === storageApproachEnum.MEMORY
          ? file.buffer
          : createReadStream(file.path),
      ContentType: ContentType || file.mimetype,
    });

    try {
      await this.client.send(command);
      return { Key };
    } catch (error) {
      throw new BadRequestException("Fail to upload this asset");
    }
  }

  // ===== UPLOAD LARGE ASSET (Multipart) =====
  async uploadLargeAsset({
    storageApproach = storageApproachEnum.DISK,
    Bucket = AWS_BUCKET_NAME,
    path = "general",
    file,
    Acl = ObjectCannedACL.private,
    ContentType,
    partSize = 5,
  }: {
    storageApproach?: storageApproachEnum;
    Bucket?: string;
    path?: string;
    file: Express.Multer.File;
    Acl?: ObjectCannedACL;
    ContentType?: string | undefined;
    partSize?: number;
  }): Promise<CompleteMultipartUploadCommandOutput> {
    const Key = `${APPLICATION_NAME}/${path}/${randomUUID()}__${file.originalname}`;

    const uploadFile = new Upload({
      client: this.client,
      params: {
        Bucket,
        Key,
        ACL: Acl,
        Body:
          storageApproach === storageApproachEnum.MEMORY
            ? file.buffer
            : createReadStream(file.path),
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

    return (await uploadFile.done()) as CompleteMultipartUploadCommandOutput;
  }

  // ===== UPLOAD MULTIPLE ASSETS =====
  async uploadAssets({
    uploadApproach = uploadApproachEnum.SMALL,
    storageApproach = storageApproachEnum.MEMORY,
    Bucket = AWS_BUCKET_NAME,
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
    if (uploadApproach === uploadApproachEnum.LARGE) {
      const data = await Promise.all(
        files.map((file) =>
          this.uploadLargeAsset({
            storageApproach,
            file,
            Acl,
            Bucket,
            ContentType,
            path,
          }),
        ),
      );
      return data.map((ele) => ele.Key as string);
    } else {
      const urls = await Promise.all(
        files.map((file) =>
          this.uploadAsset({
            storageApproach,
            file,
            Acl,
            Bucket,
            ContentType,
            path,
          }),
        ),
      );
      return urls.map((ele) => ele.Key);
    }
  }

  async createPresignedUploadLink({
    Bucket = AWS_BUCKET_NAME,
    path = "general",
    expiresIn = AWS_EXPIRES_IN,
    ContentType,
    Originalname,
  }: {
    Bucket?: string;
    path?: string;
    expiresIn?: number;
    ContentType?: string | undefined;
    Originalname: string;
  }): Promise<{ url: string; key: string }> {
    const Key = `${APPLICATION_NAME}/${path}/${randomUUID()}__${Originalname}`;

    const command = new PutObjectCommand({
      Bucket,
      Key,
      ContentType,
    });

    if (!command.input?.Key) {
      throw new BadRequestException("Fail to upload this asset");
    }

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return { url, key: command.input.Key };
  }

  async createPresignedFetchLink({
    Bucket = AWS_BUCKET_NAME,
    Key,
    expiresIn = AWS_EXPIRES_IN,
    fileName,
    download,
  }: {
    Bucket?: string;
    Key: string;
    expiresIn?: number;
    fileName?: string;
    download?: string;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition:
        download === "true"
          ? `attachment; filename="${fileName || Key.split("/").pop()}"`
          : undefined,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  async getAsset({
    Bucket = AWS_BUCKET_NAME,
    key,
  }: {
    Bucket?: string;
    key: string;
  }): Promise<StorageGetAssetResult> {
    const command = new GetObjectCommand({
      Bucket,
      Key: key,
    });

    try {
      const result = await this.client.send(command);
      return {
        body: result.Body as NodeJS.ReadableStream,
        ContentType: result.ContentType,
      };
    } catch (error) {
      throw this.toStorageError(error, key);
    }
  }

  async deleteAsset({
    Bucket = AWS_BUCKET_NAME,
    Key,
  }: {
    Bucket?: string;
    Key: string;
  }): Promise<DeleteObjectCommandOutput> {
    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    });

    try {
      return await this.client.send(command);
    } catch (error) {
      throw this.toStorageError(error, Key);
    }
  }

  async deleteAssets({
    Bucket = AWS_BUCKET_NAME,
    Keys,
  }: {
    Bucket?: string;
    Keys: string[];
  }): Promise<DeleteObjectCommandOutput[]> {
    return Promise.all(Keys.map((Key) => this.deleteAsset({ Bucket, Key })));
  }
}

export const s3Service: AssetStorage =
  new S3Service() as unknown as AssetStorage;
