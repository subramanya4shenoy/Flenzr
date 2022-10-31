import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserInfoModel {
   @Field({nullable: false})
    user_id:number; 
    
    @Field({nullable: false})
    about: string; 

    @Field({nullable: false})
    rating: string; 

    @Field({nullable: false})
    style: string;
}