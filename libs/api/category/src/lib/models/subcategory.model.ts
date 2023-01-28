import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class SubcategoryModel {

   @Field({nullable: true})
   id: number;

   @Field({nullable: true})
   subcategory: string;

}