import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class AuthSignUpInput {

    @Field()
    email: string

    @Field()
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