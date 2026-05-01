import { TokenService } from "./../../common/services/token.service";
import {
  confirmEmailDto,
  forgetPasswordDto,
  LoginDto,
  resendConfirmEmailDto,
  resetPasswordDto,
  SignupDto,
} from "./auth.dto";
import { IUser } from "../../common/interfaces";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "../../common/exceptions";
import { UserRepository } from "../../DB/repository";
import { compareHash, generateHash } from "../../common/utils/security";
import { emailEvent, emailTemplate, sendEmail } from "../../common/utils/email";
import { redisService, RedisService } from "../../common/services";
import { EmailEnum, ProviderEnum } from "../../common/enums";
import { createRandomOtp } from "../../common/utils/otp";
import { ILoginResponse } from "./auth.entity";
import { OAuth2Client } from "google-auth-library";
import { CLIENT_IDS } from "../../config/config";

export class AuthenticationService {
  private readonly userRepository: UserRepository;
  private readonly redis: RedisService;
  private readonly tokenService: TokenService;

  constructor() {
    this.userRepository = new UserRepository();
    this.tokenService = new TokenService();
    this.redis = redisService;
  }

  public async login(
    inputs: LoginDto,
    issuer: string,
  ): Promise<ILoginResponse> {
    const { email, password } = inputs;

    const user = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
    });
    if (!user) {
      throw new NotFoundException("invalid login credentials");
    }
    if (
      !(await compareHash({ plaintext: password, cipherText: user.password }))
    ) {
      throw new NotFoundException("invalid login credentials");
    }

    return await this.tokenService.createLoginCredentials(user, issuer);
  }

  private async sendEmailOtp({
    email,
    subject,
    title,
  }: {
    email: string;
    subject: EmailEnum;
    title: string;
  }) {
    const isBlockedTTL = await this.redis.ttl(
      this.redis.blockOtpKey({ email, subject }),
    );

    if (isBlockedTTL > 0) {
      throw new BadRequestException(
        `sorry we cannot request new otp while are blocked please try again after >>> ${isBlockedTTL}`,
      );
    }

    const remainingOtpTTL = await this.redis.ttl(
      this.redis.otpKey({ email, subject }),
    );

    if (remainingOtpTTL > 0) {
      throw new BadRequestException(
        `sorry we cannot request new otp while current otp still active please try again after >>> ${remainingOtpTTL}`,
      );
    }

    const maxTrial = await this.redis.get(
      this.redis.maxAttemptOtpKey({ email, subject }),
    );
    if (maxTrial >= 3) {
      await this.redis.set({
        key: this.redis.blockOtpKey({ email, subject }),
        value: 1,
        ttl: 7 * 60,
      });

      throw new BadRequestException(`you have reached the max trial`);
    }

    const code = createRandomOtp();
    await this.redis.set({
      key: this.redis.otpKey({ email, subject }),
      value: await generateHash({ plaintext: `${code}` }),
      ttl: 120,
    });

    emailEvent.emit("sendEmail", async () => {
      await sendEmail({
        to: email,
        subject,
        html: emailTemplate({ code, title }),
      });

      await this.redis.incr(this.redis.maxAttemptOtpKey({ email, subject }));
    });
  }

  public async signup({
    email,
    username,
    password,
    phone,
  }: SignupDto): Promise<IUser> {
    const checkUserExist = await this.userRepository.findOne({
      filter: { email },
      projection: "email",
      options: { lean: true },
    });

    console.log({ checkUserExist });

    if (checkUserExist) {
      throw new ConflictException("Email Exist");
    }

    const user = await this.userRepository.createOne({
      data: {
        email,
        username,
        password,
        phone: phone as string,
      },
    });

    if (!user) {
      throw new BadRequestException("Fail");
    }

    await this.sendEmailOtp({
      email,
      subject: EmailEnum.CONFIRM_EMAIL,
      title: "verify Email",
    });

    return user.toJSON();
  }

  public async confirmEmail({ email, otp }: confirmEmailDto) {
    const hashOtp = await this.redis.get(
      this.redis.otpKey({ email, subject: EmailEnum.CONFIRM_EMAIL }),
    );
    if (!hashOtp) {
      throw new NotFoundException("Expired OTP");
    }

    const account = await this.userRepository.findOne({
      filter: {
        email,
        confirmEmail: { $exists: false },
        provider: ProviderEnum.SYSTEM,
      },
    });
    if (!account) {
      throw new NotFoundException("fail to find matching account");
    }

    if (!(await compareHash({ plaintext: otp, cipherText: hashOtp }))) {
      throw new ConflictException("Invalid OTP");
    }

    account.confirmEmail = new Date();
    await account.save();

    await this.redis.deleteKey(
      await this.redis.keys(this.redis.otpKey({ email })),
    );
    return;
  }

  public async resendConfirmEmail({ email }: resendConfirmEmailDto) {
    const account = await this.userRepository.findOne({
      filter: {
        email,
        confirmEmail: { $exists: false },
        provider: ProviderEnum.SYSTEM,
      },
    });
    if (!account) {
      throw new NotFoundException("fail to find matching account");
    }

    await this.sendEmailOtp({
      email,
      subject: EmailEnum.CONFIRM_EMAIL,
      title: "verify email",
    });

    return;
  }

  private async verifyGoogleAccount(idToken: string) {
    const client = new OAuth2Client();

    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_IDS,
    });

    const payload = ticket.getPayload();

    if (!payload?.email_verified) {
      throw new BadRequestException("invalid token payload");
    }

    return payload;
  }

  async loginWithGmail(idToken: string, issuer: string) {
    const payload = await this.verifyGoogleAccount(idToken);

    const user = await this.userRepository.findOne({
      filter: {
        email: payload.email as string,
        provider: ProviderEnum.GOOGLE,
      },
    });

    if (!user) {
      throw new NotFoundException(
        "invalid account provider or not register account",
      );
    }

    return await this.tokenService.createLoginCredentials(user, issuer);
  }

  async signupWithGmail(idToken: string, issuer: string) {
    const payload = await this.verifyGoogleAccount(idToken);

    const checkExist = await this.userRepository.findOne({
      filter: {
        email: payload.email as string,
      },
    });

    console.log({ checkExist });

    if (checkExist) {
      if (checkExist.provider != ProviderEnum.GOOGLE) {
        throw new ConflictException("invalid account provider");
      }
      return {
        status: 200,
        credentials: await this.loginWithGmail(idToken, issuer),
      };
    }

    const account = await this.userRepository.createOne({
      data: {
        firstName: payload.given_name as string,
        lastName: payload.family_name as string,
        email: payload.email as string,
        profilePicture: payload.picture as string,
        confirmEmail: new Date(),
        provider: ProviderEnum.GOOGLE,
      },
    });

    return {
      status: 201,
      credentials: await this.tokenService.createLoginCredentials(
        account,
        issuer,
      ),
    };
  }

  // ===== Forget Password =====
  public async forgetPassword({ email }: forgetPasswordDto) {
    const account = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
    });

    if (!account) {
      throw new NotFoundException("account not found");
    }

    await this.sendEmailOtp({
      email,
      subject: EmailEnum.RESET_PASSWORD,
      title: "Reset Password",
    });

    return;
  }
  // ===== Reset  Password =====
  public async resetPassword({ email, otp, password }: resetPasswordDto) {
    const hashOtp = await this.redis.get(
      this.redis.otpKey({ email, subject: EmailEnum.RESET_PASSWORD }),
    );

    if (!hashOtp) {
      throw new NotFoundException("Expired OTP");
    }

    const account = await this.userRepository.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmEmail: { $exists: true },
      },
    });

    if (!account) {
      throw new NotFoundException("account not found");
    }

    const isValidOtp = await compareHash({
      plaintext: otp,
      cipherText: hashOtp,
    });

    if (!isValidOtp) {
      throw new ConflictException("Invalid OTP");
    }

    // ===== UPDATE PASSWORD =====
    account.password = password;

    // important: this triggers pre-save middleware (hashing)
    account.changeCredentialsTime = new Date();

    await account.save();

    // ===== CLEAN REDIS =====
    await this.redis.deleteKey(
      await this.redis.keys(
        this.redis.otpKey({ email, subject: EmailEnum.RESET_PASSWORD }),
      ),
    );

    return;
  }
  // ===========================
}

export default new AuthenticationService();
