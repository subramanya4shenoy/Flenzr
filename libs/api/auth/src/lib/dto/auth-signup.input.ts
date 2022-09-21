import { Field, InputType } from "@nestjs/graphql";
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

@InputType()
export class AuthSignUpInput {

    @Field()    
    @IsEmail()
    @IsNotEmpty()
    email: string

    @Field()
    @IsNotEmpty()
    @IsString()    
    @MinLength(4)
    @MaxLength(20)
    password: string

    @Field({nullable: true})
    source?: string
    
    @Field({nullable: true})
    location?: string

    @Field({nullable: true})
    language?: string

    @Field({nullable: true})
    created_ip?: string

    @Field({nullable: true})
    display_name?: string

    @Field({nullable: true})
    device_id?: string

    @Field({nullable: true})
    name?: string

    @Field(({nullable: true}))
    mobile?: string
}