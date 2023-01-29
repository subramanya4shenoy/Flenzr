import { SubcategoryModel } from "./subcategory.model";
import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CategoryModel {

   @Field({nullable: false})
   category: string;

   @Field({nullable: false})
   id: number;

   @Field(type => [SubcategoryModel],{nullable: false})
   subcategory: Array<SubcategoryModel>;
}