import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async signIn(input: AuthSignInInput): Promise<UserToken> {

    const user = await this.prisma.user.findFirst({
      where: {
        email: input.email,
      },
    });

    if (user) {
      if(user.password === input.password) {
        return { token: "awdaw", user };
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
      const newUser = await this.prisma.user.create({
        data: {
          ...input,
        },
      });
      return {token: "awda", user: newUser};
    }
  }

  comonError(msg: string): void {
    throw new ForbiddenException(msg);
  }
}
