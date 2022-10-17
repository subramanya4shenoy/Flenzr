import { Injectable } from "@nestjs/common";
import {
  GoogleAuthSignInInput,
  GoogleAuthSignUpInput,
} from "../dto/auth-tp-google.input";
import { UserToken } from "../models/user-token";
import jwt_decode from "jwt-decode";
import IGoogleUser from "../interfaces/googleUserInfo.interface";
import { AuthService } from "../auth.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class GoogleAuthService {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService
  ) {}

  /**
   * @param input
   * @returns user Object and token
   * @desc sign up the user with verfified as false,
   * crete the signInActivityDB entry.
   * @pending [send email to verify]
   */
  async signUpWithGoogle({
    clientId,
    credential,
  }: GoogleAuthSignUpInput): Promise<UserToken> {
    const userDetailsFromGoogle: IGoogleUser = jwt_decode(credential);
    const { email_verified, azp, email } = userDetailsFromGoogle;

    if (!email_verified) {
      this.authService.comonError(
        "Your account is not verified with Google. Please verify before proceeding."
      );
    }

    if (azp !== process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID) {
      this.authService.comonError(
        "Please re-login, Your session seems to be expired"
      );
    }

    if (azp === process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID && email) {
      const existingUser = await this.authService.DoesUserExists(email);
      if (!existingUser) {
        const userData = await this.createNewUser(userDetailsFromGoogle, email, clientId);
        await this.authService.updateUserLoginActivity(userData);
        return {
          token: this.authService.generateToken(userData),
          user: userData,
        };
      } else {
        this.authService.comonError(
          "You are alerady registered with us. Please try loging in via " + existingUser.source
        );
      }
    }
  }

  async signInWithGoogle(input: GoogleAuthSignInInput): Promise<UserToken> {
    const { credential } = input;
    const userDetailsFromGoogle: IGoogleUser = jwt_decode(credential);
    const { email_verified, azp, email } = userDetailsFromGoogle;
    const user = await this.authService.DoesUserExists(
      userDetailsFromGoogle.email
    );
    if (!email_verified) {
      this.authService.comonError(
        "Your account is not verified with Google. Please verify before proceeding."
      );
    }
    if (azp !== process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID) {
      this.authService.comonError(
        "Please re-login, Your session seems to be expired"
      );
    }
    if (azp === process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID && email) {

      if (user) {
        if(user.source !== 'google') {
          this.authService.comonError(
          "You are alerady registered with us via "
          + user.source + 
          ". Please try loging in via "
          + user.source
          )
        }
        await this.authService.updateUserLoginActivity(user);
        const { password, ...userData } = user;
        return {
          token: this.authService.generateToken(userData),
          user: userData,
        };
      }
      if (!user) {
        this.authService.comonError(
          "This email address is does not exist. Please try signing up"
        );
      }
    }
  }

  async createNewUser(userDetailsFromGoogle, email, clientId) {
    const { password, ...userData } = await this.prisma.user.create({
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
        g_client_id: clientId
      },
    });
    return userData;
  }
}
