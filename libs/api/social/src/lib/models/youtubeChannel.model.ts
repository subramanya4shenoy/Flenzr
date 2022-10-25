import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class YoutubeChannel {

   @Field({nullable: false})
   youtube_id: string;

   @Field({nullable: false})
   title: string;

   @Field({nullable: true})
   description: string;
    
   @Field({nullable: true})
   thumbnails_default: string;

}