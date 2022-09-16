import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";
import * as moment from 'moment';
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
      await this.prisma.user_signin_activity.update({
        where: {
        user_id: user.user_id,
        },
        data: {
          last_login_time: moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z")
        }
      })
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
    
    if(input.email == '' || input.password == '') {
      this.comonError("Please fill valid email and password");
    }
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
      await this.prisma.user_signin_activity.create({
        data: {
          user_id: newUser.user_id,
          last_login_time:  moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z"),
          location: input.location || ''
        }
      })
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
