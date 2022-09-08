import { Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";

@Injectable()
export class AuthService {

    public tempUserToken:UserToken = { token: "xyz", user: {}}

    signIn(input: AuthSignUpInput): UserToken{
        return this.tempUserToken;
    }
    signUp(input: AuthSignInInput): UserToken{
        return  this.tempUserToken;
    }
}