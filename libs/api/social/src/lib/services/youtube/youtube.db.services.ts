import { PrismaService } from "@flenzr/api/auth";
import { Injectable } from "@nestjs/common";
import { YoutubeChannel } from "../../models/youtubeChannel.model";

@Injectable()
export class YTDBService {
  constructor(private prisma: PrismaService) {}

  async setYTAuth(
    id,
    userId,
    access_token,
    refresh_token,
    expiry_date
  ): Promise<any> {
    return await this.prisma.google_yt_auth.upsert({
      where: {
        youtube_id: id,
      },
      update: {
        access_token: access_token,
        refresh_token: refresh_token,
        expiry_date: expiry_date,
      },
      create: {
        youtube_id: id,
        user_id: userId,
        access_token: access_token,
        refresh_token: refresh_token,
        expiry_date: expiry_date,
      },
    });
  }

  async setYTData(userId: number, item: any) {
    return await this.prisma.youtube.upsert({
      where: {
        youtube_id: item.id,
      },
      update: {
        user_id: userId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnails_default: item.snippet.thumbnails.default.url,
        thumbnails_medium: item.snippet.thumbnails.medium.url,
        thumbnails_high: item.snippet.thumbnails.high.url,
        is_active: true
      },
      create: {
        youtube_id: item.id,
        user_id: userId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnails_default: item.snippet.thumbnails.default.url,
        thumbnails_medium: item.snippet.thumbnails.medium.url,
        thumbnails_high: item.snippet.thumbnails.high.url,
      },
    });
  }

  async setYTStats(userId: number, item: any) {
    return await this.prisma.youtube_stats.upsert({
      where: {
        youtube_id: item.id,
      },
      update: {
        user_id: userId,
        view_count: item.statistics.viewCount,
        video_count: item.statistics.videoCount,
        subscriber_count: item.statistics.subscriberCount,
        hidden_subscriber_count: item.statistics.hiddenSubscriberCount,
      },
      create: {
        youtube_id: item.id,
        user_id: userId,
        view_count: item.statistics.viewCount,
        video_count: item.statistics.videoCount,
        subscriber_count: item.statistics.subscriberCount,
        hidden_subscriber_count: item.statistics.hiddenSubscriberCount,
      },
    });
  }

  async getAllYTChannel(userId: number): Promise<Array<YoutubeChannel>> {
    return await this.prisma.youtube.findMany({
      where: {
        user_id: userId,
        is_active: true 
      }
    })
  }

  async disableYTChannel(channel_id:string): Promise<YoutubeChannel> {
    return await this.prisma.youtube.update({
      where: {
        youtube_id: channel_id 
      },
      data: {
        is_active: false
      }
    })
  }
}
