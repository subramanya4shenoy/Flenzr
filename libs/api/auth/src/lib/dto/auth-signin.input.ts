import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class AuthSignInInput{
    @Field()
    email?: string

    @Field()
    mobile?: string

    @Field()
    password: string
}