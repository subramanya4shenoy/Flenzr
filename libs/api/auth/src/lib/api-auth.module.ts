import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { AuthResolver } from "./auth.resolver";
import { AuthService } from "./auth.service";
import { PrismaService } from "./prisma.service";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./guard/auth/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.NX_JWT_SECRET,
      signOptions: { expiresIn: 60*60*24*3 + "s"  },
    }),
  ],
  controllers: [],
  providers: [AuthResolver, AuthService, PrismaService, JwtStrategy],
  exports: [JwtStrategy],
})
export class ApiAuthModule {}
