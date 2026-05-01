import express from "express";
import { authRouter, userRouter } from "./modules";
import { globalErrorHandler } from "./middleware";
import { PORT } from "./config/config";
import connectDB from "./DB/connection.db";
import cors from "cors";
import { cloudinaryService, redisService } from "./common/services";
import { UserRepository } from "./DB/repository";
import { pipeline } from "node:stream/promises";
import { successResponse } from "./common/response";
import type { StorageError } from "./common/interfaces";

const bootstrap = async (): Promise<void> => {
  const app: express.Express = express();

  app.use(express.json(), cors());

  app.get(
    "/",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): express.Response => {
      return res.status(200).json({ message: "Landing Page" });
    },
  );

  // application-routing
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  // GET ASSET WITH STREAM AND DOWNLOAD
  app.get(
    "/uploads/*path",
    async (req: express.Request, res: express.Response) => {
      ///////////////////////////////
      // Extract query parameters
      ///////////////////////////////
      const { download, fileName } = req.query as {
        download: string;
        fileName: string;
      };

      ///////////////////////////////
      // Extract and process the asset path
      ///////////////////////////////
      const rawPath = req.params.path;
      const Key = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;

      if (!Key) {
        return res.status(400).json({
          message: "Missing asset key",
          error: { name: "BadRequest", Key: "", httpStatusCode: 400 },
        });
      }

      try {
        // Fetch asset from the service
        const { body, ContentType } = await cloudinaryService.getAsset({
          key: Key,
        });

        // Set Content-Type header if available
        if (ContentType) {
          res.setHeader("Content-Type", ContentType);
        }

        ////////////////////////////////////////////////////////
        // Set security and resource policies
        ////////////////////////////////////////////////////////
        res.set("Cross-Origin-Resource-Policy", "cross-origin");

        // Handle download disposition
        if (download === "true") {
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName || Key.split("/").pop()}"`,
          );
        }

        // Stream the file body to the response
        await pipeline(body, res);
        return;
      } catch (error: any) {
        // Error handling and response
        return res.status(error.httpStatusCode || 404).json({
          message: error.message,
          error: {
            name: error.name,
            Key: error.Key,
            httpStatusCode: error.httpStatusCode,
          },
        });
      }
    },
  );
  // GET PRESIGNED LINK
  app.get(
    "/presigned/*path",
    async (req: express.Request, res: express.Response) => {
      const wildcardKey = (req.params as Record<string, any>).path;
      const fallbackKey = (req.params as Record<string, any>)[0];
      const rawKey = Array.isArray(wildcardKey)
        ? wildcardKey.join("/")
        : (wildcardKey ?? fallbackKey ?? "");

      let Key = rawKey ? decodeURIComponent(rawKey) : "";

      if (Key.startsWith("/")) {
        Key = Key.substring(1);
      }

      if (!Key) {
        const storageError: StorageError = {
          name: "NoSuchKey",
          message: "Missing asset key",
          httpStatusCode: 400,
          Key: "",
        };
        return res.status(storageError.httpStatusCode).json({
          message: storageError.message,
          error: storageError,
        });
      }

      try {
        const download = req.query.download?.toString();
        const fileName = req.query.fileName?.toString();

        const url = await cloudinaryService.createPresignedFetchLink({
          Key,
          download,
          fileName,
        } as any);

        return successResponse({ res, data: { url } });
      } catch (error: any) {
        const storageError: StorageError = {
          name: error?.name === "AccessDenied" ? "AccessDenied" : "NoSuchKey",
          message:
            typeof error?.message === "string" && error.message.length
              ? error.message
              : "The specified key does not exist.",
          httpStatusCode:
            typeof error?.httpStatusCode === "number"
              ? error.httpStatusCode
              : 404,
          Key:
            typeof error?.Key === "string" && error.Key.length
              ? error.Key
              : Key,
        };

        return res.status(storageError.httpStatusCode).json({
          message: storageError.message,
          error: storageError,
        });
      }
    },
  );

  app.get(
    "/*dummy",
    (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ): express.Response => {
      return res.status(404).json({ message: "Invalid application routing" });
    },
  );

  // application-error
  app.use(globalErrorHandler);

  await connectDB();
  await redisService.connect();

  // ===== MIDDLEWARE USAGE & TESTING  =====
  try {
    const userRepository = new UserRepository();

    // ===== 1. CREATE (triggers pre-save middleware) =====
    const createdUser = await userRepository.createOne({
      data: {
        firstName: "Abo",
        lastName: "Magd",
        slug: "abo-magd",
        email: `test_${Date.now()}@mail.com`,
        password: "123456",
        phone: "01000000000",
      },
    });

    // console.log("CREATED USER:", createdUser);

    // ===== 2. UPDATE (triggers pre-update middleware + phone encryption) =====
    await userRepository.updateOne({
      filter: { _id: createdUser._id },
      update: {
        phone: "01111111111",
      },
    });

    // console.log("UPDATED USER PHONE");

    // ===== 3. SOFT DELETE (sets deletedAt, unsets restoredAt) =====
    await userRepository.updateOne({
      filter: { _id: createdUser._id },
      update: {
        deletedAt: new Date(),
      },
    });

    // console.log("SOFT DELETED USER");

    // ===== 4. NORMAL FIND (should return null due to paranoid filtering) =====
    await userRepository.findOne({
      filter: { _id: createdUser._id },
    });

    // console.log("NORMAL FIND (should be null):", normalFind);

    // ===== 5. FIND INCLUDING SOFT-DELETED DOCUMENTS =====
    await userRepository.findOne({
      filter: {
        _id: createdUser._id,
        paranoid: false, // disable paranoid filtering
      } as any,
    });

    // console.log("FIND WITH PARANOID FALSE:", withDeleted);

    // ===== 6. RESTORE (sets restoredAt, unsets deletedAt) =====
    await userRepository.updateOne({
      filter: { _id: createdUser._id },
      update: {
        restoredAt: new Date(),
      },
    });

    // console.log("USER RESTORED");

    // ===== 7. FORCE DELETE (bypasses soft delete protection) =====
    await userRepository.deleteOne({
      filter: {
        _id: createdUser._id,
        force: true,
      } as any,
    });

    // console.log("USER FORCE DELETED");
  } catch (error) {
    console.log("BOOTSTRAP ERROR:", error);
  }
  // ===== MIDDLEWARE USAGE & TESTING  =====

  app.listen(PORT, () => {
    console.log(`Server Is Running On Port <<<${PORT}>>>`);
  });

  console.log("application bootstrapped successfully ⚡");
};

export default bootstrap;
