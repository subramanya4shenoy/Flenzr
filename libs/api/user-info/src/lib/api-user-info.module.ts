import { GqlAuthGuard, PrismaService } from '@flenzr/api/auth';
import { Module } from '@nestjs/common';
import { UserInfoResolver } from './api-user-info.resolver';
import { UserInfoDBService } from './services/user-info.db.service';
import { UserInfoService } from './services/user-info.service';

@Module({
	controllers: [],
	providers: [UserInfoResolver, GqlAuthGuard, UserInfoService, UserInfoDBService, PrismaService],
	exports: [],
})
export class ApiUserInfoModule {}
