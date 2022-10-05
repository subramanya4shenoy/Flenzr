import { Injectable } from "@nestjs/common";
import { InstagramAuthSignUpInput } from "../dto/auth-tp-instagram.input";
import IInstagramUser from "../interfaces/instagramUserInfo.interface";
import { UserToken } from "../models/user-token";
import jwt_decode from "jwt-decode";

@Injectable()
export class InstagramAuthService {

    async signInWithInstagram(input: InstagramAuthSignUpInput): Promise<UserToken>{
        const { credential } = input;
        const userDetailsFromInstagram: IInstagramUser = jwt_decode(credential);
        console.log(userDetailsFromInstagram);
        return {
            token: "aad",
            user: {
                display_name: "awd",
                email: "AWDdw",
                user_id: 122, 
                verified: true, 
                mobile_verified: false,
                language: "en", 
                name: "ad"
            }
        };
    }
}