"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictException = exports.NotFoundException = exports.ForbiddenException = exports.UnauthorizedException = exports.BadRequestException = void 0;
const application_exception_1 = require("./application.exception");
var HttpStatus;
(function (HttpStatus) {
    HttpStatus[HttpStatus["BAD_REQUEST"] = 400] = "BAD_REQUEST";
    HttpStatus[HttpStatus["UNAUTHORIZED"] = 401] = "UNAUTHORIZED";
    HttpStatus[HttpStatus["FORBIDDEN"] = 403] = "FORBIDDEN";
    HttpStatus[HttpStatus["NOT_FOUND"] = 404] = "NOT_FOUND";
    HttpStatus[HttpStatus["CONFLICT"] = 409] = "CONFLICT";
})(HttpStatus || (HttpStatus = {}));
class BadRequestException extends application_exception_1.ApplicationException {
    constructor(message = "Bad Request", cause) {
        super(message, HttpStatus.BAD_REQUEST, cause);
    }
}
exports.BadRequestException = BadRequestException;
class UnauthorizedException extends application_exception_1.ApplicationException {
    constructor(message = "Unauthorized", cause) {
        super(message, HttpStatus.UNAUTHORIZED, cause);
    }
}
exports.UnauthorizedException = UnauthorizedException;
class ForbiddenException extends application_exception_1.ApplicationException {
    constructor(message = "Forbidden", cause) {
        super(message, HttpStatus.FORBIDDEN, cause);
    }
}
exports.ForbiddenException = ForbiddenException;
class NotFoundException extends application_exception_1.ApplicationException {
    constructor(message = "Not Found", cause) {
        super(message, HttpStatus.NOT_FOUND, cause);
    }
}
exports.NotFoundException = NotFoundException;
class ConflictException extends application_exception_1.ApplicationException {
    constructor(message = "Conflict", cause) {
        super(message, HttpStatus.CONFLICT, cause);
    }
}
exports.ConflictException = ConflictException;
