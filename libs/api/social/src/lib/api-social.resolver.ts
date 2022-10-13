import { Query, Resolver } from "@nestjs/graphql";

@Resolver()
export class SocialResolver {

    // Fetch all youtube channels of user
    @Query(() => String)
    fetchAllYtChannels(): string {
        return "ytChannels boi!"
    }
}