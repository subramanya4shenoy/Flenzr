import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { PrismaService } from "./prisma.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./guard/auth/jwt.strategy";
import { GoogleAuthService } from "./services/google-auth.service";
import { FBAuthService } from "./services/facebook-auth.service";
import { InstagramAuthService } from "./services/instagram-auth.service";
import { GqlAuthGuard } from "./guard/auth/jwt-auth.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.NX_JWT_SECRET,
      signOptions: { expiresIn: 60 * 60 * 24 * 3 + "s" },
    }),
  ],
  controllers: [],
  providers: [
    AuthResolver,
    AuthService,
    GoogleAuthService,
    FBAuthService,
    InstagramAuthService,
    PrismaService,
    JwtStrategy,
    GqlAuthGuard
  ],
  exports: [JwtStrategy, GqlAuthGuard],
})
export class ApiAuthModule {}
