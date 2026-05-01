"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer_enum_1 = require("./../../common/enums/multer.enum");
const enums_1 = require("../../common/enums");
const config_1 = require("../../config/config");
const exceptions_1 = require("../../common/exceptions");
const services_1 = require("../../common/services");
class UserService {
    redis;
    tokenService;
    s3;
    constructor() {
        this.redis = services_1.redisService;
        this.tokenService = new services_1.TokenService();
        this.s3 = services_1.cloudinaryService;
    }
    async profileImage({ ContentType, Originalname, }, user) {
        const oldPic = user.profilePicture;
        const params = {
            path: `Users/${user._id.toString()}/profile`,
            ContentType,
            Originalname,
        };
        const uploadData = await this.s3.createPresignedUploadLink(params);
        user.profilePicture = uploadData.key;
        await user.save();
        if (oldPic && oldPic !== uploadData.key) {
            this.s3.deleteAsset({ Key: oldPic }).catch(() => null);
        }
        return {
            user: user.toJSON(),
            uploadData,
        };
    }
    async profileCoverImages(files, user) {
        const oldCoverPictures = [...(user.profileCoverPictures || [])];
        const params = {
            files,
            path: `Users/${user._id.toString()}/profile/cover`,
            storageApproach: multer_enum_1.storageApproachEnum.DISK,
            uploadApproach: multer_enum_1.uploadApproachEnum.LARGE,
        };
        const urls = await this.s3.uploadAssets(params);
        user.profileCoverPictures = urls;
        await user.save();
        if (oldCoverPictures.length) {
            await this.s3.deleteAssets({ Keys: oldCoverPictures });
        }
        return user.toJSON();
    }
    async profile(user) {
        return user.toJSON();
    }
    async logout({ flag }, user, { jti, iat, sub }) {
        let status = 200;
        switch (flag) {
            case enums_1.LogoutEnum.ALL:
                user.changeCredentialsTime = new Date();
                await user.save();
                const baseRevokeTokenKey = this.redis.baseRevokeTokenKey(sub);
                await this.redis.deleteKey(await this.redis.keys(`${baseRevokeTokenKey}::*`));
                break;
            default:
                await this.tokenService.createRevokeToken({
                    userId: sub,
                    jti,
                    ttl: iat + config_1.REFRESH_EXPIRES_IN,
                });
                status = 201;
                break;
        }
        return status;
    }
    async rotateToken(user, { sub, jti, iat }, issuer) {
        if ((iat + config_1.ACCESS_EXPIRES_IN) * 1000 >= Date.now() + 30000) {
            throw new exceptions_1.ConflictException("current access token still valid");
        }
        await this.tokenService.createRevokeToken({
            userId: sub,
            jti,
            ttl: iat + config_1.REFRESH_EXPIRES_IN,
        });
        return await this.tokenService.createLoginCredentials(user, issuer);
    }
}
exports.default = new UserService();
