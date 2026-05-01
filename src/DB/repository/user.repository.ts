import { IUser } from "../../common/interfaces";
import { UserModel } from "../model/user.model";
import { DatabaseRepository } from "./base.repository";

export class UserRepository extends DatabaseRepository<IUser> {
  constructor() {
    super(UserModel);
  }
}
