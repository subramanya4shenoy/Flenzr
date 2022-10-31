import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { GqlAuthGuard } from "@flenzr/api/auth";
import { UseGuards } from "@nestjs/common";
import { UserInfoService } from "./services/user-info.service";
import IUserInfo from "./interface/user-info.interface";
import { UserInfoModel } from "./models/user-info.model";

@Resolver()
export class UserInfoResolver {
        
    constructor(private readonly userInfoService:UserInfoService) {}

    @Mutation(() => UserInfoModel)
    @UseGuards(GqlAuthGuard)
    async updateUserAbout(@Context() context, @Args("infoTxt") infoTxt: string): Promise<IUserInfo> {
        return await this.userInfoService.updateUserAbout(context.req.user.user_id, infoTxt);
    }

    @Query(() => UserInfoModel)
    @UseGuards(GqlAuthGuard)
    async getUserInfo(@Context() context): Promise<IUserInfo> {
        return await this.userInfoService.getUserInfo(context.req.user.user_id)
    }
}