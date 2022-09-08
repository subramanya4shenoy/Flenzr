import { Args, Mutation, Resolver } from "@nestjs/graphql";
import { AuthService } from "./auth.service";
import { AuthSignInInput } from "./dto/auth-signin.input";
import { AuthSignUpInput } from "./dto/auth-signup.input";
import { UserToken } from "./models/user-token";

@Resolver()
export class AuthResolver {

    constructor(private readonly service:AuthService) {}
    
    @Mutation(()=> UserToken)
    signIn(@Args('input', {type: () => AuthSignInInput}) input: AuthSignInInput): UserToken{
        return this.service.signIn(input);
    }
    
    @Mutation(() => UserToken)
    signUp(@Args('input') input: AuthSignUpInput): UserToken{
        return this.service.signUp(input);
    }

}