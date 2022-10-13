import { ApiAuthModule } from '@flenzr/api/auth';
import { ApiCoreModule } from '@flenzr/api/core';
import { ApiSocialModule } from '@flenzr/api/social';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [ApiCoreModule, ApiAuthModule, ApiSocialModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
