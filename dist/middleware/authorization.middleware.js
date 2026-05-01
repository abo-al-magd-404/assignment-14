"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorization = void 0;
const exceptions_1 = require("../common/exceptions");
const authorization = (accessRoles) => {
    return (req, res, next) => {
        if (!accessRoles.includes(req.user.role)) {
            throw new exceptions_1.ForbiddenException("not authorized account");
        }
        return next();
    };
};
exports.authorization = authorization;
