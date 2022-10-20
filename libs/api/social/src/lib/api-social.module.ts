import { GqlAuthGuard, PrismaService } from "@flenzr/api/auth";
import { Module } from "@nestjs/common";
import { SocialResolver } from "./api-social.resolver";
import { YTService } from "./services/youtube/youtube.services";
import { HttpModule } from "@nestjs/axios";
import { YTDBService } from "./services/youtube/youtube.db.services";

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [SocialResolver, YTService, YTDBService, GqlAuthGuard, PrismaService],
  exports: [],
})
export class ApiSocialModule {}
