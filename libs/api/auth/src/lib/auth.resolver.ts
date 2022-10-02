import { UseGuards } from "@nestjs/common";
import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { FacebookAuthSignInInput, FacebookAuthSignUpInput } from "./dto/auth-tp-facebook.input";
import {
  GoogleAuthSignInInput,
  GoogleAuthSignUpInput,
} from "./dto/auth-tp-google.input";
import { GqlAuthGuard } from "./guard/auth/jwt-auth.guard";
import { UserToken } from "./models/user-token";
import { FBAuthService } from "./services/facebook-auth.service";
import { GoogleAuthService } from "./services/google-auth.service";

@Resolver()
export class AuthResolver {
  constructor(
    private readonly service: AuthService,
    private readonly googleService: GoogleAuthService,
    private readonly fbService: FBAuthService
  ) {}
  @Mutation(() => UserToken)
  async signIn(@Args("input") input: AuthSignInInput): Promise<UserToken> {
    return this.service.signIn(input);
  }

  @Mutation(() => UserToken)
  async signUp(@Args("input") input: AuthSignUpInput): Promise<UserToken> {
    return this.service.signUp(input);
  }

  @Mutation(() => UserToken)
  async signUpWithGoogle(
    @Args("input") input: GoogleAuthSignUpInput
  ): Promise<UserToken> {
    return this.googleService.signUpWithGoogle(input);
  }

  @Mutation(() => UserToken)
  async signInWithGoogle(
    @Args("input") input: GoogleAuthSignInInput
  ): Promise<UserToken> {
    return this.googleService.signInWithGoogle(input);
  }

  @Mutation(() => UserToken)
  async signUpWithFb(
    @Args("input") input: FacebookAuthSignUpInput
  ): Promise<UserToken> {
    return this.fbService.signUpWithFb(input);
  }

  @Mutation(() => UserToken)
  async signInWithFb(
    @Args("input") input: FacebookAuthSignInInput
  ): Promise<UserToken> {
    return this.fbService.signInWithFb(input);
  }

  @Query(() => String)
  @UseGuards(GqlAuthGuard)
  getPotato(@Context() context): string {
    console.log("Asked for potato");
    console.log(context.req.user);
    return "potato";
  }
}
