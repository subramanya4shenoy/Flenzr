import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";
import { GqlAuthGuard } from "./guard/auth/jwt-auth.guard";

@Resolver()
export class SocialResolver {

    // Fetch all youtube channels of user
    @Query(() => String)
    @UseGuards(GqlAuthGuard)
    fetchAllYtChannels(): string {
        return "ytChannels boi!"
    }
}