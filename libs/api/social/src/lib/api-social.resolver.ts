import { GqlAuthGuard } from "@flenzr/api/auth";
import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";

@Resolver()
export class SocialResolver {

    // Fetch all youtube channels of user
    @Query(() => String)
    @UseGuards(GqlAuthGuard)
    fetchAllYtChannels(): string {
        return "ytChannels boi!"
    }
}