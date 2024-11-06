import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { IUserRepositories } from "../domain/repositories/IUser.repositories";

@Injectable()
export class FindUserByIdService {
  constructor(
    @Inject('USER_SERVICE_TOKEN')
    private readonly userRepositories: IUserRepositories,
  ) { }

  async execute(id: number): Promise<User> {
    return await this.userRepositories.findUserById(id);
  }
}
