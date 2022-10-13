import { ApiAuthModule } from '@flenzr/api/auth';
import { Module } from '@nestjs/common';
import { SocialResolver } from './api-social.resolver';
import { GqlAuthGuard } from './guard/auth/jwt-auth.guard';

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
