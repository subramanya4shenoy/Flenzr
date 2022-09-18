import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { GoogleAuthSignUpInput } from "./dto/auth-tp-google.input";
import { GqlAuthGuard } from "./guard/auth/jwt-auth.guard";
import { UserToken } from "./models/user-token";

@Resolver()
export class AuthResolver {
  constructor(private readonly service: AuthService) {}
  @Query(() => UserToken)
  async signIn(@Args('input') input:AuthSignInInput): Promise<UserToken> {
    return this.service.signIn(input);
  }

  @Mutation(() => UserToken)
  async signUp(@Args('input') input: AuthSignUpInput): Promise<UserToken>{
      return this.service.signUp(input);
  }

  @Mutation(() => UserToken)
  async signUpWithGoogle(@Args('input') input: GoogleAuthSignUpInput): Promise<UserToken>{
    return this.service.signUpWithGoogle(input)
  }

  @Query(() => String)
    getPotato(): string {
      console.log("Asked for potato")
      return "potato"
    }
  
}
