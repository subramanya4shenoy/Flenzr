import { GqlAuthGuard } from "@flenzr/api/auth";
import { Module } from "@nestjs/common";
import { SocialResolver } from "./api-social.resolver";
import { YTService } from "./services/youtube.services";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [SocialResolver, YTService, GqlAuthGuard],
  exports: [],
})
export class ApiSocialModule {}
