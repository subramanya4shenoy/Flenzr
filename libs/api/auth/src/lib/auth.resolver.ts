import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
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
}
