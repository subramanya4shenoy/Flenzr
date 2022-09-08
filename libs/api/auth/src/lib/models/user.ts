import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class User {

   @Field({nullable: true})
   user_id?: number;

   @Field({nullable: true})
   email?: string;

   @Field({nullable: true})
   mobile?: string;
}