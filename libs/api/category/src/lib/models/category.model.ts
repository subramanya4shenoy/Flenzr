import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CatgoryModel {

   @Field({nullable: false})
   category: string;

   @Field(() => [String])
   subcategory: string[];

}