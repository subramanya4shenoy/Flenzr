import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class InstagramAuthSignUpInput {
    @Field()
    credential: string
}

@InputType()
export class InstagramAuthSignInInput {
    @Field()
    credential: string
}