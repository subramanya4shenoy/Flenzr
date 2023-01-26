import { ApiAuthModule } from '@flenzr/api/auth';
import { ApiCategoryModule } from '@flenzr/api/category';
import { ApiCoreModule } from '@flenzr/api/core';
import { ApiSocialModule } from '@flenzr/api/social';
import { ApiUserInfoModule } from '@flenzr/api/user-info';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ApiCoreModule, ApiAuthModule, ApiSocialModule, ApiUserInfoModule, ApiCategoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
