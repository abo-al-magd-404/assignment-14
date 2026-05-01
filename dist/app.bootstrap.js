"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const modules_1 = require("./modules");
const middleware_1 = require("./middleware");
const config_1 = require("./config/config");
const connection_db_1 = __importDefault(require("./DB/connection.db"));
const cors_1 = __importDefault(require("cors"));
const services_1 = require("./common/services");
const repository_1 = require("./DB/repository");
const promises_1 = require("node:stream/promises");
const response_1 = require("./common/response");
const bootstrap = async () => {
    const app = (0, express_1.default)();
    app.use(express_1.default.json(), (0, cors_1.default)());
    app.get("/", (req, res, next) => {
        return res.status(200).json({ message: "Landing Page" });
    });
    app.use("/auth", modules_1.authRouter);
    app.use("/user", modules_1.userRouter);
    app.get("/uploads/*path", async (req, res) => {
        const { download, fileName } = req.query;
        const rawPath = req.params.path;
        const Key = Array.isArray(rawPath) ? rawPath.join("/") : rawPath;
        if (!Key) {
            return res.status(400).json({
                message: "Missing asset key",
                error: { name: "BadRequest", Key: "", httpStatusCode: 400 },
            });
        }
        try {
            const { body, ContentType } = await services_1.cloudinaryService.getAsset({
                key: Key,
            });
            if (ContentType) {
                res.setHeader("Content-Type", ContentType);
            }
            res.set("Cross-Origin-Resource-Policy", "cross-origin");
            if (download === "true") {
                res.setHeader("Content-Disposition", `attachment; filename="${fileName || Key.split("/").pop()}"`);
            }
            await (0, promises_1.pipeline)(body, res);
            return;
        }
        catch (error) {
            return res.status(error.httpStatusCode || 404).json({
                message: error.message,
                error: {
                    name: error.name,
                    Key: error.Key,
                    httpStatusCode: error.httpStatusCode,
                },
            });
        }
    });
    app.get("/presigned/*path", async (req, res) => {
        const wildcardKey = req.params.path;
        const fallbackKey = req.params[0];
        const rawKey = Array.isArray(wildcardKey)
            ? wildcardKey.join("/")
            : (wildcardKey ?? fallbackKey ?? "");
        let Key = rawKey ? decodeURIComponent(rawKey) : "";
        if (Key.startsWith("/")) {
            Key = Key.substring(1);
        }
        if (!Key) {
            const storageError = {
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
            const url = await services_1.cloudinaryService.createPresignedFetchLink({
                Key,
                download,
                fileName,
            });
            return (0, response_1.successResponse)({ res, data: { url } });
        }
        catch (error) {
            const storageError = {
                name: error?.name === "AccessDenied" ? "AccessDenied" : "NoSuchKey",
                message: typeof error?.message === "string" && error.message.length
                    ? error.message
                    : "The specified key does not exist.",
                httpStatusCode: typeof error?.httpStatusCode === "number"
                    ? error.httpStatusCode
                    : 404,
                Key: typeof error?.Key === "string" && error.Key.length
                    ? error.Key
                    : Key,
            };
            return res.status(storageError.httpStatusCode).json({
                message: storageError.message,
                error: storageError,
            });
        }
    });
    app.get("/*dummy", (req, res, next) => {
        return res.status(404).json({ message: "Invalid application routing" });
    });
    app.use(middleware_1.globalErrorHandler);
    await (0, connection_db_1.default)();
    await services_1.redisService.connect();
    try {
        const userRepository = new repository_1.UserRepository();
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
        await userRepository.updateOne({
            filter: { _id: createdUser._id },
            update: {
                phone: "01111111111",
            },
        });
        await userRepository.updateOne({
            filter: { _id: createdUser._id },
            update: {
                deletedAt: new Date(),
            },
        });
        await userRepository.findOne({
            filter: { _id: createdUser._id },
        });
        await userRepository.findOne({
            filter: {
                _id: createdUser._id,
                paranoid: false,
            },
        });
        await userRepository.updateOne({
            filter: { _id: createdUser._id },
            update: {
                restoredAt: new Date(),
            },
        });
        await userRepository.deleteOne({
            filter: {
                _id: createdUser._id,
                force: true,
            },
        });
    }
    catch (error) {
        console.log("BOOTSTRAP ERROR:", error);
    }
    app.listen(config_1.PORT, () => {
        console.log(`Server Is Running On Port <<<${config_1.PORT}>>>`);
    });
    console.log("application bootstrapped successfully ⚡");
};
exports.default = bootstrap;
