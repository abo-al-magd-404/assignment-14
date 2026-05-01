export type StorageGetAssetResult = {
  body: NodeJS.ReadableStream;
  ContentType?: string | undefined;
};

export type StorageErrorName = "NoSuchKey" | "AccessDenied";

export type StorageError = {
  name: StorageErrorName;
  message: string;
  httpStatusCode: number;
  Key: string;
};

export type StorageUploadParams = {
  storageApproach?: any; // narrowed in each service (kept for strategy interchangeability)
  Bucket?: string | undefined;
  path?: string | undefined;
  file: Express.Multer.File;
  Acl?: string | undefined;
  ContentType?: string | undefined;
};

export type StorageUploadManyParams = Omit<StorageUploadParams, "file"> & {
  uploadApproach?: any;
  files: Express.Multer.File[];
};

export type StoragePresignedParams = {
  Bucket?: string | undefined;
  path?: string | undefined;
  expiresIn?: number | undefined;
  ContentType?: string | undefined;
  Originalname: string;
};

export type StorageGetParams = {
  Bucket?: string | undefined;
  key: string;
};

export interface AssetStorage {
  uploadAsset(params: StorageUploadParams): Promise<{ Key: string }>;

  uploadLargeAsset(params: StorageUploadParams): Promise<{ Key: string }>;

  uploadAssets(
    params: StorageUploadManyParams,
  ): Promise<string[]>;

  createPresignedUploadLink(
    params: StoragePresignedParams,
  ): Promise<{ url: string; key: string }>;

  // تم التحديث لدعم الـ Download و FileName
  createPresignedFetchLink(params: {
    Key: string;
    expiresIn?: number;
    fileName?: string; // أضفنا هذا
    download?: string; // أضفنا هذا
  }): Promise<string>;

  getAsset(params: StorageGetParams): Promise<StorageGetAssetResult>;

  // --- العمليات الناقصة التي يجب إضافتها ---

  // حذف ملف واحد
  deleteAsset(params: { Key: string; Bucket?: string }): Promise<any>;

  // حذف ملفات متعددة (مفيد جداً لتحسين الأداء)
  deleteAssets(params: { Keys: string[]; Bucket?: string }): Promise<any>;

  // للتحقق من وجود ملف (اختياري)
  // assetExists(params: { Key: string; Bucket?: string }): Promise<boolean>;
}
