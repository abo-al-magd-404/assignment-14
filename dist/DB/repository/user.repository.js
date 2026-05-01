"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_model_1 = require("../model/user.model");
const base_repository_1 = require("./base.repository");
class UserRepository extends base_repository_1.DatabaseRepository {
    constructor() {
        super(user_model_1.UserModel);
    }
}
exports.UserRepository = UserRepository;
