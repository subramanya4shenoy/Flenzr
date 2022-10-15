import { GqlAuthGuard } from "@flenzr/api/auth";
import { UseGuards } from "@nestjs/common";
import { Query, Resolver, Context } from "@nestjs/graphql";
import { YTService } from "./services/youtube.services";

@Resolver()
export class SocialResolver {

    constructor(private readonly ytService: YTService){}

    // Fetch all youtube channels of user
    @Query(() => String)
    @UseGuards(GqlAuthGuard)
    fetchAllYtChannels(@Context() context): Promise<string> {
        return this.ytService.getYoutubeChannels(context.req.user);
    }
}