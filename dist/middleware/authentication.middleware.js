"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authentication = void 0;
const token_service_1 = require("./../common/services/token.service");
const exceptions_1 = require("../common/exceptions");
const enums_1 = require("../common/enums");
const authentication = (tokenType = enums_1.TokenTypeEnum.ACCESS) => {
    return async (req, res, next) => {
        const tokenService = new token_service_1.TokenService();
        const [key, credential] = req.headers?.authorization?.split(" ") || [];
        console.log({ key, credential });
        if (!key || !credential) {
            throw new exceptions_1.UnauthorizedException("missing authorization");
        }
        switch (key) {
            case "Base":
                break;
            default:
                const { decoded, user } = await tokenService.decodeToken({
                    token: credential,
                    tokenType,
                });
                req.user = user;
                req.decoded = decoded;
                break;
        }
        next();
    };
};
exports.authentication = authentication;
