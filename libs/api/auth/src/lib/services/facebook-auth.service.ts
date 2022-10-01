import { Injectable } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { FacebookAuthSignInInput } from "../dto/auth-tp-facebook.input";
import IFacebookUser from "../interfaces/facebookUserInfo.interface";
import jwt_decode from "jwt-decode";
import { UserToken } from "../models/user-token";
import { PrismaService } from "../prisma.service";

@Injectable()
export class FBAuthService {
  constructor(
    private readonly authService: AuthService,
    private prisma: PrismaService
  ) {}

  /**
   * @param input
   * @returns user Object and token
   * @desc sign up the user with verfified as false,
   * crete the signInActivityDB entry.
   * @pending [send email to verify]
   */
  async signUpWithFb(input: FacebookAuthSignInInput): Promise<UserToken> {
    const { credential } = input;
    const userDetailsFromFacebook: IFacebookUser = jwt_decode(credential);
    const { email } = userDetailsFromFacebook;

    if (email) {
      const existingUser = await this.authService.DoesUserExists(email);
      if (!existingUser) {
        const userData = await this.createNewUser(
          userDetailsFromFacebook,
          email
        );
        await this.authService.updateUserLoginActivity(userData);
        return {
          token: this.authService.generateToken(userData),
          user: userData,
        };
      } else {
        this.authService.comonError(
          "You are alerady registered with us. Please try loging in via Facebook"
        );
      }
    }
  }

  async createNewUser(userDetailsFromFacebook, email) {
    const { password, ...userData } = await this.prisma.user.create({
      data: {
        email: email,
        verified: true,
        source: "facebook",
        mobile_verified: false,
        location: null,
        language: null,
        created_ip: null,
        display_name: userDetailsFromFacebook.name,
        device_id: null,
        name: userDetailsFromFacebook.name,
        password: "",
        mobile: null,
      },
    });
    return userData;
  }
}
