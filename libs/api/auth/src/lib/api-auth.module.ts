import { Module } from '@nestjs/common';
import { AuthResolver } from './auth.resolver';
import { AuthService } from './auth.service';
import { PrismaService } from './prisma.service';

@Module({
	controllers: [],
	providers: [AuthResolver, AuthService, PrismaService],
	exports: [],
})
export class ApiAuthModule {}
