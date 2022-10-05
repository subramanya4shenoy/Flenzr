import { Injectable } from "@nestjs/common";
import { InstagramAuthSignUpInput } from "../dto/auth-tp-instagram.input";
import IInstagramUser from "../interfaces/instagramUserInfo.interface";
import { UserToken } from "../models/user-token";
import jwt_decode from "jwt-decode";
import { AuthService } from "../auth.service";
import { PrismaService } from "../prisma.service";

@Injectable()
export class InstagramAuthService {
  constructor(
    private readonly authService: AuthService,
    private prisma: PrismaService
  ) {}

  async signInWithInstagram(input: InstagramAuthSignUpInput): Promise<UserToken> {
    const { credential } = input;
    const userDetailsFromInstagram: IInstagramUser = jwt_decode(credential);
    const { data } = userDetailsFromInstagram;
    const { user_id } = data;
    const email = user_id + "@flenzr.com"; 
    const user = await this.authService.DoesUserExists(email);
      if (user) {
        if(user.source !== 'instagram') {
          this.authService.comonError(
          "You are alerady registered with us via "
          + user.source + 
          ". Please try loging in via "
          + user.source)
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

  async signUpWithInstagram(
    input: InstagramAuthSignUpInput
  ): Promise<UserToken> {
    const { credential } = input;
    const userDetailsFromInstagram: IInstagramUser = jwt_decode(credential);
    const { data } = userDetailsFromInstagram;
    const { user_id } = data;
    const email = user_id + "@flenzr.com";
    const existingUser = await this.authService.DoesUserExists(email);
    if (!existingUser) {
        const userData = await this.createNewUser(
            data,
            email
          );
          await this.authService.updateUserLoginActivity(userData);
          return {
            token: this.authService.generateToken(userData),
            user: userData,
          };
    } else {
      this.authService.comonError(
        "You are alerady registered with us. Please try loging in via " +
          existingUser.source
      );
    }
  }

  async createNewUser(userDetailsFromInstagram, email) {
    const { username } = userDetailsFromInstagram
    const { password, ...userData } = await this.prisma.user.create({
      data: {
        email: email,
        verified: true,
        source: "instagram",
        mobile_verified: false,
        location: null,
        language: null,
        created_ip: null,
        display_name: username,
        device_id: null,
        name: username,
        password: "",
        mobile: null,
      },
    });
    return userData;
  }
}
