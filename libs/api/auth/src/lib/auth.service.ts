import { Injectable } from "@nestjs/common";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";
import { PrismaService } from "./prisma.service";


@Injectable()
export class AuthService {

    constructor(private prisma: PrismaService) {}

    public tempUserToken:UserToken = { token: "xwyz", user: {}}

    async signIn(input: AuthSignInInput): Promise<UserToken>{
        console.log("call service");
        const user = await this.prisma.facebook.create({
            data: {
                user_id: 21
            },
          })
        return this.tempUserToken;
    }


    async signUp(input: AuthSignUpInput): Promise<UserToken>{
        const user = await this.prisma.user.create({
            data: {
                email: "test@t.com",
                password: "test123"
            },
          })
        return  this.tempUserToken;
    }
}