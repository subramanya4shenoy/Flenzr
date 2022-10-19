import { GqlAuthGuard } from "@flenzr/api/auth";
import { UseGuards } from "@nestjs/common";
import { Query, Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { YTService } from "./services/youtube.services";

@Resolver()
export class SocialResolver {

    constructor(private readonly ytService: YTService){}

    // Fetch all youtube channels of user
    @Query(() => String)
    @UseGuards(GqlAuthGuard)
    addNewYTChannel(): Promise<string> {
        return this.ytService.addYoutubeChannel();
    }

    @Mutation(() => String)
    @UseGuards(GqlAuthGuard)
    setYTChannelDetails(@Args("code") code: string, @Context() context): Promise<string>{
        return this.ytService.setChannelDetails(code, context.req.user);
    }
}