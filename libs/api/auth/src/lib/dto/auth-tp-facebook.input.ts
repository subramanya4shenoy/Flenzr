import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class FacbookAuthSignUpInput {
    @Field()
    credential: string
}


@InputType()
export class FacebookAuthSignInInput {
    @Field()
    credential: string
}