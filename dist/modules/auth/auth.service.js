"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const token_service_1 = require("./../../common/services/token.service");
const exceptions_1 = require("../../common/exceptions");
const repository_1 = require("../../DB/repository");
const security_1 = require("../../common/utils/security");
const email_1 = require("../../common/utils/email");
const services_1 = require("../../common/services");
const enums_1 = require("../../common/enums");
const otp_1 = require("../../common/utils/otp");
const google_auth_library_1 = require("google-auth-library");
const config_1 = require("../../config/config");
class AuthenticationService {
    userRepository;
    redis;
    tokenService;
    constructor() {
        this.userRepository = new repository_1.UserRepository();
        this.tokenService = new token_service_1.TokenService();
        this.redis = services_1.redisService;
    }
    async login(inputs, issuer) {
        const { email, password } = inputs;
        const user = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true },
            },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("invalid login credentials");
        }
        if (!(await (0, security_1.compareHash)({ plaintext: password, cipherText: user.password }))) {
            throw new exceptions_1.NotFoundException("invalid login credentials");
        }
        return await this.tokenService.createLoginCredentials(user, issuer);
    }
    async sendEmailOtp({ email, subject, title, }) {
        const isBlockedTTL = await this.redis.ttl(this.redis.blockOtpKey({ email, subject }));
        if (isBlockedTTL > 0) {
            throw new exceptions_1.BadRequestException(`sorry we cannot request new otp while are blocked please try again after >>> ${isBlockedTTL}`);
        }
        const remainingOtpTTL = await this.redis.ttl(this.redis.otpKey({ email, subject }));
        if (remainingOtpTTL > 0) {
            throw new exceptions_1.BadRequestException(`sorry we cannot request new otp while current otp still active please try again after >>> ${remainingOtpTTL}`);
        }
        const maxTrial = await this.redis.get(this.redis.maxAttemptOtpKey({ email, subject }));
        if (maxTrial >= 3) {
            await this.redis.set({
                key: this.redis.blockOtpKey({ email, subject }),
                value: 1,
                ttl: 7 * 60,
            });
            throw new exceptions_1.BadRequestException(`you have reached the max trial`);
        }
        const code = (0, otp_1.createRandomOtp)();
        await this.redis.set({
            key: this.redis.otpKey({ email, subject }),
            value: await (0, security_1.generateHash)({ plaintext: `${code}` }),
            ttl: 120,
        });
        email_1.emailEvent.emit("sendEmail", async () => {
            await (0, email_1.sendEmail)({
                to: email,
                subject,
                html: (0, email_1.emailTemplate)({ code, title }),
            });
            await this.redis.incr(this.redis.maxAttemptOtpKey({ email, subject }));
        });
    }
    async signup({ email, username, password, phone, }) {
        const checkUserExist = await this.userRepository.findOne({
            filter: { email },
            projection: "email",
            options: { lean: true },
        });
        console.log({ checkUserExist });
        if (checkUserExist) {
            throw new exceptions_1.ConflictException("Email Exist");
        }
        const user = await this.userRepository.createOne({
            data: {
                email,
                username,
                password,
                phone: phone,
            },
        });
        if (!user) {
            throw new exceptions_1.BadRequestException("Fail");
        }
        await this.sendEmailOtp({
            email,
            subject: enums_1.EmailEnum.CONFIRM_EMAIL,
            title: "verify Email",
        });
        return user.toJSON();
    }
    async confirmEmail({ email, otp }) {
        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: enums_1.EmailEnum.CONFIRM_EMAIL }));
        if (!hashOtp) {
            throw new exceptions_1.NotFoundException("Expired OTP");
        }
        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmEmail: { $exists: false },
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("fail to find matching account");
        }
        if (!(await (0, security_1.compareHash)({ plaintext: otp, cipherText: hashOtp }))) {
            throw new exceptions_1.ConflictException("Invalid OTP");
        }
        account.confirmEmail = new Date();
        await account.save();
        await this.redis.deleteKey(await this.redis.keys(this.redis.otpKey({ email })));
        return;
    }
    async resendConfirmEmail({ email }) {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                confirmEmail: { $exists: false },
                provider: enums_1.ProviderEnum.SYSTEM,
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("fail to find matching account");
        }
        await this.sendEmailOtp({
            email,
            subject: enums_1.EmailEnum.CONFIRM_EMAIL,
            title: "verify email",
        });
        return;
    }
    async verifyGoogleAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: config_1.CLIENT_IDS,
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new exceptions_1.BadRequestException("invalid token payload");
        }
        return payload;
    }
    async loginWithGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        const user = await this.userRepository.findOne({
            filter: {
                email: payload.email,
                provider: enums_1.ProviderEnum.GOOGLE,
            },
        });
        if (!user) {
            throw new exceptions_1.NotFoundException("invalid account provider or not register account");
        }
        return await this.tokenService.createLoginCredentials(user, issuer);
    }
    async signupWithGmail(idToken, issuer) {
        const payload = await this.verifyGoogleAccount(idToken);
        const checkExist = await this.userRepository.findOne({
            filter: {
                email: payload.email,
            },
        });
        console.log({ checkExist });
        if (checkExist) {
            if (checkExist.provider != enums_1.ProviderEnum.GOOGLE) {
                throw new exceptions_1.ConflictException("invalid account provider");
            }
            return {
                status: 200,
                credentials: await this.loginWithGmail(idToken, issuer),
            };
        }
        const account = await this.userRepository.createOne({
            data: {
                firstName: payload.given_name,
                lastName: payload.family_name,
                email: payload.email,
                profilePicture: payload.picture,
                confirmEmail: new Date(),
                provider: enums_1.ProviderEnum.GOOGLE,
            },
        });
        return {
            status: 201,
            credentials: await this.tokenService.createLoginCredentials(account, issuer),
        };
    }
    async forgetPassword({ email }) {
        const account = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true },
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("account not found");
        }
        await this.sendEmailOtp({
            email,
            subject: enums_1.EmailEnum.RESET_PASSWORD,
            title: "Reset Password",
        });
        return;
    }
    async resetPassword({ email, otp, password }) {
        const hashOtp = await this.redis.get(this.redis.otpKey({ email, subject: enums_1.EmailEnum.RESET_PASSWORD }));
        if (!hashOtp) {
            throw new exceptions_1.NotFoundException("Expired OTP");
        }
        const account = await this.userRepository.findOne({
            filter: {
                email,
                provider: enums_1.ProviderEnum.SYSTEM,
                confirmEmail: { $exists: true },
            },
        });
        if (!account) {
            throw new exceptions_1.NotFoundException("account not found");
        }
        const isValidOtp = await (0, security_1.compareHash)({
            plaintext: otp,
            cipherText: hashOtp,
        });
        if (!isValidOtp) {
            throw new exceptions_1.ConflictException("Invalid OTP");
        }
        account.password = password;
        account.changeCredentialsTime = new Date();
        await account.save();
        await this.redis.deleteKey(await this.redis.keys(this.redis.otpKey({ email, subject: enums_1.EmailEnum.RESET_PASSWORD })));
        return;
    }
}
exports.AuthenticationService = AuthenticationService;
exports.default = new AuthenticationService();
