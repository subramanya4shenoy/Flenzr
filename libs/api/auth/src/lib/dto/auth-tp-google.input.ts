import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class GoogleAuthSignUpInput {
    @Field()
    clientId: string

    @Field()
    credential: string
}