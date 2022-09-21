import { ForbiddenException, Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as moment from "moment";
import {
  GoogleAuthSignInInput,
  GoogleAuthSignUpInput,
} from "./dto/auth-tp-google.input";
import jwt_decode from "jwt-decode";
import IGoogleUser from "./interfaces/googleUserInfo.interface";
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
    const userExist = await this.DoesUserExists(input.email);
    console.log("service ->", userExist);
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
    const { credential } = input;
    const userDetailsFromGoogle: IGoogleUser = jwt_decode(credential);
    const { email_verified, azp, email } = userDetailsFromGoogle;
    if (!email_verified) {
      this.comonError(
        "Your account is not verified with Google. Please verify before proceeding."
      );
    }
    if (azp !== process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID) {
      this.comonError("Please re-login, Your session seems to be expired");
    }

    if (azp === process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID && email) {
      console.log("EMAIL AND USEREXIST", email, this.DoesUserExists(email));
      const existingUser = await this.DoesUserExists(email);
      if (!existingUser) {
        const newUser = await this.prisma.user.create({
          data: {
            email: email,
            verified: true,
            source: "google",
            mobile_verified: false,
            location: null,
            language: null,
            created_ip: null,
            display_name: userDetailsFromGoogle.name,
            device_id: null,
            name:
              userDetailsFromGoogle.given_name +
              " " +
              userDetailsFromGoogle.family_name,
            password: "",
            mobile: null,
          },
        });
        this.updateUserLoginActivity(newUser);
        return { token: this.generateToken(newUser), user: newUser };
      } else {
        this.comonError(
          "You are alerady registered with us. Please try loging in via Google"
        );
      }
    }
  }

  /**
   *
   */
  async signInWithGoogle(input: GoogleAuthSignInInput): Promise<UserToken> {
    const { credential } = input;
    const userDetailsFromGoogle: IGoogleUser = jwt_decode(credential);
    const { email_verified, azp, email } = userDetailsFromGoogle;
    const user = await this.DoesUserExists(userDetailsFromGoogle.email);
    console.log(userDetailsFromGoogle, user);
    if (!email_verified) {
      this.comonError(
        "Your account is not verified with Google. Please verify before proceeding."
      );
    }
    if (azp !== process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID) {
      this.comonError("Please re-login, Your session seems to be expired");
    }
    if (azp === process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID && email) {
      if (user) {
        return { token: this.generateToken(user), user: user };
      } 
      if (!user) {
        this.comonError(
          "This email address is does not exist. Please try signing up"
        );
      }
    }

  }

  /**
   * Check for if user already exists
   * @param email
   * @returns
   */
  async DoesUserExists(email: string) {
    console.log(email);
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
    const logedInUser = this.prisma.user_signin_activity.findFirst({
      where: {
        user_id: user.user_id,
      },
    });
    if (!logedInUser) {
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
