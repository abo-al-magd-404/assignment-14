"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogoutEnum = exports.TokenTypeEnum = void 0;
var TokenTypeEnum;
(function (TokenTypeEnum) {
    TokenTypeEnum[TokenTypeEnum["ACCESS"] = 0] = "ACCESS";
    TokenTypeEnum[TokenTypeEnum["REFRESH"] = 1] = "REFRESH";
})(TokenTypeEnum || (exports.TokenTypeEnum = TokenTypeEnum = {}));
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum[LogoutEnum["ONLY"] = 0] = "ONLY";
    LogoutEnum[LogoutEnum["ALL"] = 1] = "ALL";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
