import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class GoogleAuthSignUpInput {
    @Field()
    clientId: string

    @Field()
    credential: string
}


@InputType()
export class GoogleAuthSignInInput {
    @Field()
    clientId: string

    @Field()
    credential: string
}