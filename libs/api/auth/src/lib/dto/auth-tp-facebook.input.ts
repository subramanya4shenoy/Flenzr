import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class FacebookAuthSignUpInput {
    @Field()
    credential: string
}


@InputType()
export class FacebookAuthSignInInput {
    @Field()
    credential: string
}