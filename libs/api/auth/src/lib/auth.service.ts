import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as moment from "moment";
import { THIRDPARTY_SOURCERS } from "./constants/thirdpartySources.constant";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  /**
   * @name SignIn logic
   * @desc if user found login and update signin activity
   */
  async signIn(input: AuthSignInInput): Promise<UserToken> {
    const user = await this.DoesUserExists(input.email);
    /** If user found update signin activity and send token and userInfo */
    if (user) {
      // if user is registered with us via thirdparty we ask them to login with the same
      if (THIRDPARTY_SOURCERS.includes(user.source)) {
        this.comonError("Please login via " + user.source);
      }
      await this.updateUserLoginActivity(user);
      const isMatch = await bcrypt.compare(input.password, user.password);
      if (isMatch) {
        const { password, ...userData} = user;
        return { token: this.generateToken(userData), user: userData };
      } else {
        this.comonError("Password miss-match");
      }
    }
    if (!user) {
      this.comonError(
        "This email address is does not exist. Please try signing up"
      );
    }
  }

  /**
   * @param input
   * @returns user Object and token
   * @desc sign up the user with verfified as false,
   * crete the signInActivityDB entry.
   * @pending [send email to verify]
   */
  async signUp(input: AuthSignUpInput): Promise<UserToken> {
    if (input.email == "" || input.password == "") {
      this.comonError("Please fill valid email and password");
    }
    const userExist = await this.DoesUserExists(input.email);
    if (userExist) {
      this.comonError(
        "This email address is already registered. Please try Loging In " + 
        (userExist.source ? " via " + userExist.source : '')
      );
    } else {
      const salt = 10;
      const hash = await bcrypt.hash(input.password, salt);
      input.password = hash;
      const newUser = await this.prisma.user.create({
        data: {
          ...input,
        },
      });
      await this.updateUserLoginActivity(newUser);
      const { password, ...userData} = newUser;
      return { token: this.generateToken(userData), user: userData };
    }
  }

  /**
   * Check for if user already exists
   * @param email
   * @returns
   */
  async DoesUserExists(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    return user;
  }

  /**
   *
   * @param user false for already exisitng user
   * @param isNewuser true id triggered while signup
   */
  async updateUserLoginActivity(user) {
    await this.prisma.user_signin_activity.upsert({
      where: {
        user_id: user.user_id,
      },
      update: {
        last_login_time: moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z"),
        location: user.location || "",
      },
      create: {
        user_id: user.user_id,
        last_login_time: moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z"),
        location: user.location || "",
      }
    });
  }

  /**
   * @desc logic to generate jwt token
   * @param payload
   * @returns
   */
  generateToken(payload): string {
    return this.jwtService.sign(payload);
  }

  /**
   * @desc using default forbidden error
   * @param msg
   * @pending need to handle the error types properly and
   * avoid common forbidden method.
   */
  comonError(msg: string): void {
    throw new ForbiddenException(msg);
  }
}
