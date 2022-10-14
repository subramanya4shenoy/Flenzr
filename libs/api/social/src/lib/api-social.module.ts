import { ApiAuthModule, GqlAuthGuard } from '@flenzr/api/auth';
import { Module } from '@nestjs/common';
import { SocialResolver } from './api-social.resolver';
@Module({
	imports: [ApiAuthModule],
	controllers: [],
	providers: [
		SocialResolver,
		GqlAuthGuard
	],
	exports: [],
})
export class ApiSocialModule {}
