"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisService = exports.RedisService = void 0;
const redis_1 = require("redis");
const config_1 = require("../../config/config");
const enums_1 = require("../enums");
class RedisService {
    client;
    constructor() {
        this.client = (0, redis_1.createClient)({ url: config_1.REDIS_URL });
        this.handleEvents();
    }
    handleEvents() {
        this.client.on("error", (error) => {
            console.log(`REDIS ERROR >>> ${error}`);
        });
        this.client.on("ready", () => {
            console.log(`REDIS IS READY ✔`);
        });
    }
    async connect() {
        await this.client.connect();
        console.log(`Redis Is Connected ⚡`);
    }
    otpKey = ({ email, subject = enums_1.EmailEnum.CONFIRM_EMAIL, }) => {
        return `OTP::USER::${email}::${subject}`;
    };
    maxAttemptOtpKey = ({ email, subject = enums_1.EmailEnum.CONFIRM_EMAIL, }) => {
        return `${this.otpKey({ email, subject })}::MaxTrial`;
    };
    blockOtpKey = ({ email, subject = enums_1.EmailEnum.CONFIRM_EMAIL, }) => {
        return `${this.otpKey({ email, subject })}::Block`;
    };
    baseRevokeTokenKey = (userId) => {
        return `RevokeToken::${userId.toString()}`;
    };
    revokeTokenKey = ({ userId, jti, }) => {
        return `${this.baseRevokeTokenKey(userId)}::${jti}`;
    };
    set = async ({ key, value, ttl, }) => {
        try {
            let data = typeof value === "string" ? value : JSON.stringify(value);
            return ttl
                ? await this.client.set(key, data, { EX: ttl })
                : await this.client.set(key, data);
        }
        catch (error) {
            console.log(`FAIL IN REDIS SET OPERATION ${error}`);
            return null;
        }
    };
    update = async ({ key, value, ttl, }) => {
        try {
            if (!(await this.client.exists(key)))
                return 0;
            return await this.set({ key, value, ttl });
        }
        catch (error) {
            console.log(`FAIL IN REDIS UPDATE OPERATION ${error}`);
            return null;
        }
    };
    get = async (key) => {
        try {
            try {
                return JSON.parse((await this.client.get(key)));
            }
            catch (error) {
                return await this.client.get(key);
            }
        }
        catch (error) {
            console.log(`FAIL IN REDIS GET OPERATION ${error}`);
            return;
        }
    };
    ttl = async (key) => {
        try {
            return await this.client.ttl(key);
        }
        catch (error) {
            console.log(`FAIL IN REDIS TTL OPERATION ${error}`);
            return -2;
        }
    };
    exists = async (key) => {
        try {
            return await this.client.exists(key);
        }
        catch (error) {
            console.log(`FAIL IN REDIS EXISTS OPERATION ${error}`);
            return -2;
        }
    };
    incr = async (key) => {
        try {
            return await this.client.incr(key);
        }
        catch (error) {
            console.log(`FAIL IN REDIS INCR OPERATION ${error}`);
            return -2;
        }
    };
    expire = async ({ key, ttl, }) => {
        try {
            return await this.client.expire(key, ttl);
        }
        catch (error) {
            console.log(`FAIL IN REDIS EXPIRE OPERATION ${error}`);
            return 0;
        }
    };
    mGet = async (keys) => {
        try {
            if (!keys.length)
                return 0;
            return (await this.client.mGet(keys));
        }
        catch (error) {
            console.log(`FAIL IN REDIS MGET OPERATION ${error}`);
            return [];
        }
    };
    keys = async (prefix) => {
        try {
            return await this.client.keys(`${prefix}`);
        }
        catch (error) {
            console.log(`FAIL IN REDIS KEYS OPERATION ${error}`);
            return [];
        }
    };
    deleteKey = async (key) => {
        try {
            if (!key.length)
                return 0;
            return await this.client.del(key);
        }
        catch (error) {
            console.log(`FAIL IN REDIS DEL OPERATION ${error}`);
            return 0;
        }
    };
}
exports.RedisService = RedisService;
exports.redisService = new RedisService();
