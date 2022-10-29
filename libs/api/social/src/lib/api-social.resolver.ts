import { GqlAuthGuard } from "@flenzr/api/auth";
import { UseGuards } from "@nestjs/common";
import { Query, Resolver, Mutation, Args, Context } from "@nestjs/graphql";
import { YoutubeChannel } from "./models/youtubeChannel.model";
import { YTService } from "./services/youtube/youtube.services";

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
    setYTChannelDetails(@Args("code") code: string, @Context() context): Promise<any>{
        return this.ytService.setChannelDetails(code, context.req.user.user_id);
    }

    @Mutation(() => String)
    @UseGuards(GqlAuthGuard)
    disableYTChannel(@Args("youtube_id") youtube_id: string): Promise<any>{
        return this.ytService.disableYtChannel(youtube_id);
    }

    @Query(() => [YoutubeChannel])
    @UseGuards(GqlAuthGuard)
    getAllYTChannelDetailsOfUSer(@Context() context): Promise<Array<YoutubeChannel>>{
        return this.ytService.getAllChannelsDetailsOfUser(context.req.user.user_id);
    }
}