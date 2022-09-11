import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class User {

   @Field({nullable: true})
   user_id: number;

   @Field()
   email: string;

   @Field({defaultValue: false, description: "verifird if email is verified"})
   verified: boolean;

   @Field({defaultValue: false})
   mobile_verified: boolean;

   @Field({nullable: true})
   language: string;

   @Field({nullable: true})
   display_name: string;

   @Field({nullable: true})
   name: string;

}