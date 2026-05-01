import {
  storageApproachEnum,
  uploadApproachEnum,
} from "./../../common/enums/multer.enum";
import { HydratedDocument } from "mongoose";
import { IUser } from "../../common/interfaces";
import { LogoutEnum } from "../../common/enums";
import { ACCESS_EXPIRES_IN, REFRESH_EXPIRES_IN } from "../../config/config";
import { ConflictException } from "../../common/exceptions";
import {
  cloudinaryService,
  redisService,
  RedisService,
  TokenService,
} from "../../common/services";
import type {
  AssetStorage,
  StoragePresignedParams,
  StorageUploadManyParams,
} from "../../common/interfaces";

class UserService {
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;
  // الحركة اللي انا عملتها هنا انني استدعيت cloudinary باسم الs3 علشان امشي مع المهندس اللي بيشرح ومتلغبطش ولما اخلص البروجيكت باذن الله مش هنسي انني اعدلها تاني 😂
  private readonly s3: AssetStorage;
  // ====================================
  // ===================================
  // ==================================

  constructor() {
    this.redis = redisService;
    this.tokenService = new TokenService();
    this.s3 = cloudinaryService;
  }

  async profileImage(
    {
      ContentType,
      Originalname,
    }: { ContentType?: string | undefined; Originalname: string },
    user: HydratedDocument<IUser>,
  ): Promise<{ user: IUser; uploadData: { url: string; key: string } }> {
    const oldPic = user.profilePicture;
    const params: StoragePresignedParams = {
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
      user: user.toJSON() as IUser,
      uploadData,
    };
  }

  async profileCoverImages(
    files: Express.Multer.File[],
    user: HydratedDocument<IUser>,
  ) {
    const oldCoverPictures = [...(user.profileCoverPictures || [])];
    const params: StorageUploadManyParams = {
      files,
      path: `Users/${user._id.toString()}/profile/cover`,
      storageApproach: storageApproachEnum.DISK,
      uploadApproach: uploadApproachEnum.LARGE,
    };
    const urls = await this.s3.uploadAssets(params);

    user.profileCoverPictures = urls;

    await user.save();

    if (oldCoverPictures.length) {
      await this.s3.deleteAssets({ Keys: oldCoverPictures });
    }

    return user.toJSON();
  }

  async profile(user: HydratedDocument<IUser>): Promise<any> {
    return user.toJSON();
  }

  async logout(
    { flag }: { flag: LogoutEnum },
    user: HydratedDocument<IUser>,
    { jti, iat, sub }: { jti: string; iat: number; sub: string },
  ): Promise<number> {
    let status = 200;

    switch (flag) {
      case LogoutEnum.ALL:
        user.changeCredentialsTime = new Date();
        await user.save();
        const baseRevokeTokenKey = this.redis.baseRevokeTokenKey(sub);
        await this.redis.deleteKey(
          await this.redis.keys(`${baseRevokeTokenKey}::*`),
        );
        break;
      default:
        await this.tokenService.createRevokeToken({
          userId: sub,
          jti,
          ttl: iat + REFRESH_EXPIRES_IN,
        });
        status = 201;
        break;
    }
    return status;
  }

  async rotateToken(
    user: HydratedDocument<IUser>,
    { sub, jti, iat }: { sub: string; jti: string; iat: number },
    issuer: string,
  ) {
    if ((iat + ACCESS_EXPIRES_IN) * 1000 >= Date.now() + 30000) {
      throw new ConflictException("current access token still valid");
    }

    await this.tokenService.createRevokeToken({
      userId: sub,
      jti,
      ttl: iat + REFRESH_EXPIRES_IN,
    });

    return await this.tokenService.createLoginCredentials(user, issuer);
  }
}

export default new UserService();
