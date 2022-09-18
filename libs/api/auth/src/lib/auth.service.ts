import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as moment from "moment";
import { GoogleAuthSignUpInput } from "./dto/auth-tp-google.input";
import jwt_decode from "jwt-decode";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  /**
   * @name SignIn logic
   * @desc if user found login and update signin activity
   */
  async signIn(input: AuthSignInInput): Promise<UserToken> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email },
    });

    /** If user found update signin activity and send token and userInfo */
    if (user) {
      await this.updateUserLoginActivity(user, false);
      const isMatch = await bcrypt.compare(input.password, user.password);
      if (isMatch) {
        return { token: this.generateToken(user), user: user };
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
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: input.email,
      },
    });

    if (existingUser) {
      this.comonError(
        "This email address is already registered. Please try Loging In"
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
      await this.updateUserLoginActivity(newUser, true);
      return { token: this.generateToken(newUser), user: newUser };
    }
  }

  /**
   * @param input
   * @returns user Object and token
   * @desc sign up the user with verfified as false,
   * crete the signInActivityDB entry.
   * @pending [send email to verify]
   */
  async signUpWithGoogle(input: GoogleAuthSignUpInput): Promise<UserToken> {
    const {clientId, credential} = input;
    const decoded = jwt_decode(credential);
    console.log(decoded);
    return {
      token: clientId,
      user: {
        user_id: 1,
        verified: false,
        mobile_verified: false,
        language: "en",
        name: "",
        display_name: "",
        email: "",
      },
    };
  }

  /**
   *
   * @param user false for already exisitng user
   * @param isNewuser true id triggered while signup
   */
  async updateUserLoginActivity(user, isNewuser?) {
    if (!isNewuser) {
      await this.prisma.user_signin_activity.update({
        where: {
          user_id: user.user_id,
        },
        data: {
          last_login_time: moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z"),
          location: user.location || "",
        },
      });
    } else {
      await this.prisma.user_signin_activity.create({
        data: {
          user_id: user.user_id,
          last_login_time: moment().format("D-MMM-YY hh.mm.ss.SSSSSS A Z"),
          location: user.location || "",
        },
      });
    }
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
