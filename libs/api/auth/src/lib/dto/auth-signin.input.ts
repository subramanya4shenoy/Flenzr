import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty } from 'class-validator';

@InputType()
export class AuthSignInInput{
    @Field({nullable: false})
    @IsEmail()
    email: string

    @Field({nullable: false})
    @IsNotEmpty()
    password: string
    
    last_login_time: string
    
    @Field({nullable: true})
    location: string
}