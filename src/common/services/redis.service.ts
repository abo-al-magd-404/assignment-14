import { createClient, RedisClientType } from "redis";
import { REDIS_URL } from "../../config/config";
import { EmailEnum } from "../enums";
import { Types } from "mongoose";

type RedisKeyType = { email: string; subject?: EmailEnum };

export class RedisService {
  private readonly client: RedisClientType;

  constructor() {
    this.client = createClient({ url: REDIS_URL });
    this.handleEvents();
  }

  private handleEvents() {
    this.client.on("error", (error) => {
      console.log(`REDIS ERROR >>> ${error}`);
    });
    this.client.on("ready", () => {
      console.log(`REDIS IS READY ✔`);
    });
  }

  public async connect() {
    await this.client.connect();
    console.log(`Redis Is Connected ⚡`);
  }

  otpKey = ({
    email,
    subject = EmailEnum.CONFIRM_EMAIL,
  }: RedisKeyType): string => {
    return `OTP::USER::${email}::${subject}`;
  };

  maxAttemptOtpKey = ({
    email,
    subject = EmailEnum.CONFIRM_EMAIL,
  }: RedisKeyType): string => {
    return `${this.otpKey({ email, subject })}::MaxTrial`;
  };

  blockOtpKey = ({
    email,
    subject = EmailEnum.CONFIRM_EMAIL,
  }: RedisKeyType): string => {
    return `${this.otpKey({ email, subject })}::Block`;
  };

  baseRevokeTokenKey = (userId: Types.ObjectId | string): string => {
    return `RevokeToken::${userId.toString()}`;
  };

  revokeTokenKey = ({
    userId,
    jti,
  }: {
    userId: Types.ObjectId | string;
    jti: string;
  }): string => {
    return `${this.baseRevokeTokenKey(userId)}::${jti}`;
  };

  set = async ({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl?: number | undefined;
  }): Promise<string | null> => {
    try {
      let data = typeof value === "string" ? value : JSON.stringify(value);
      return ttl
        ? await this.client.set(key, data, { EX: ttl })
        : await this.client.set(key, data);
    } catch (error) {
      console.log(`FAIL IN REDIS SET OPERATION ${error}`);
      return null;
    }
  };

  update = async ({
    key,
    value,
    ttl,
  }: {
    key: string;
    value: any;
    ttl?: number | undefined;
  }): Promise<string | number | null> => {
    try {
      if (!(await this.client.exists(key))) return 0;
      return await this.set({ key, value, ttl });
    } catch (error) {
      console.log(`FAIL IN REDIS UPDATE OPERATION ${error}`);
      return null;
    }
  };

  get = async (key: string): Promise<any> => {
    try {
      try {
        return JSON.parse((await this.client.get(key)) as string);
      } catch (error) {
        return await this.client.get(key);
      }
    } catch (error) {
      console.log(`FAIL IN REDIS GET OPERATION ${error}`);
      return;
    }
  };

  ttl = async (key: string): Promise<number> => {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.log(`FAIL IN REDIS TTL OPERATION ${error}`);
      return -2;
    }
  };

  exists = async (key: string): Promise<number> => {
    try {
      return await this.client.exists(key);
    } catch (error) {
      console.log(`FAIL IN REDIS EXISTS OPERATION ${error}`);
      return -2;
    }
  };

  incr = async (key: string): Promise<number> => {
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.log(`FAIL IN REDIS INCR OPERATION ${error}`);
      return -2;
    }
  };

  expire = async ({
    key,
    ttl,
  }: {
    key: string;
    ttl: number;
  }): Promise<number> => {
    try {
      return await this.client.expire(key, ttl);
    } catch (error) {
      console.log(`FAIL IN REDIS EXPIRE OPERATION ${error}`);
      return 0;
    }
  };

  mGet = async (keys: string[]): Promise<string[] | number | null> => {
    try {
      if (!keys.length) return 0;
      return (await this.client.mGet(keys)) as string[];
    } catch (error) {
      console.log(`FAIL IN REDIS MGET OPERATION ${error}`);
      return [];
    }
  };

  keys = async (prefix: string): Promise<string[]> => {
    try {
      return await this.client.keys(`${prefix}`);
    } catch (error) {
      console.log(`FAIL IN REDIS KEYS OPERATION ${error}`);
      return [];
    }
  };

  deleteKey = async (key: string | string[]): Promise<number> => {
    try {
      if (!key.length) return 0;
      return await this.client.del(key);
    } catch (error) {
      console.log(`FAIL IN REDIS DEL OPERATION ${error}`);
      return 0;
    }
  };

}

export const redisService = new RedisService();
