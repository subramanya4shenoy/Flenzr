import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}
  
  async signIn(input: AuthSignInInput): Promise<UserToken> {
    const user = await this.prisma.user.findFirst({
      where: {
        email: input.email,
      },
    });

    if (user) {
      const isMatch = await bcrypt.compare(input.password, user.password);
      if(isMatch) {
        return {token: this.generateToken(user), user: user};
      } else { this.comonError("Password miss-match"); }
    }
    if (!user) {
      this.comonError("This email address is does not exist. Please try signing up");
    }
  }

  async signUp(input: AuthSignUpInput): Promise<UserToken> {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: input.email,
      },
    });
    if (existingUser) { 
      this.comonError("This email address is already registered. Please try Loging In");
    } else {
      const salt = 10
      const hash = await bcrypt.hash(input.password, salt);
      input.password = hash;
      const newUser = await this.prisma.user.create({
        data: {
          ...input,
        },
      });
      return {token: this.generateToken(newUser), user: newUser};
    }
  }

  generateToken(payload):string {
    return this.jwtService.sign(payload);
  }

  comonError(msg: string): void {
    throw new ForbiddenException(msg);
  }
}
