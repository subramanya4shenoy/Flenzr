import { PrismaService } from "@flenzr/api/auth";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { YT_CONFIG } from "../config/youtube.config";
import IYTChannelDetails from "../interfaces/youtube-channel-detail.interface";
import IYTToken from "../interfaces/youtube-token.interface";

@Injectable()
export class YTService {
  constructor(private prisma: PrismaService) {}
  private auth: any;

  async addYoutubeChannel() {
    this.auth = new google.auth.OAuth2(
      process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID,
      process.env.NX_GOOGLE_CLIENT_SECRET,
      process.env.NX_GOOGLE_YT_REDIRECT_URL
    );
    const authorizationUrl = await this.auth.generateAuthUrl(YT_CONFIG);
    return authorizationUrl;
  }

  async setChannelDetails(code: string, user_id): Promise<string> {
    const tokenData = await this.getTokenForCode(code);
    const { access_token, refresh_token, expiry_date } = tokenData;
    const youtube = google.youtube("v3");
    const { status, data } = await youtube.channels.list({
      part: ["snippet,contentDetails,statistics"],
      key: process.env.NX_GOOGLE_YT_API_KEY,
      mine: true,
      access_token: access_token,
    });
    if (status === 200 && data) {
      const { items } = data;
      // store the  data in 3 diferent DBS
      items.forEach(async (item: IYTChannelDetails) => {
        const storeToken = await this.setYTAuth(
          item.id,
          user_id,
          access_token,
          refresh_token,
          expiry_date
        );
        if (storeToken) {
          const youtubeData = await this.prisma.youtube.upsert({
            where: {
              youtube_id: item.id,
            },
            update: {
              user_id: user_id,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnails_default: item.snippet.thumbnails.default.url,
              thumbnails_medium: item.snippet.thumbnails.medium.url,
              thumbnails_high: item.snippet.thumbnails.high.url,
            },
            create: {
              youtube_id: item.id,
              user_id: user_id,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnails_default: item.snippet.thumbnails.default.url,
              thumbnails_medium: item.snippet.thumbnails.medium.url,
              thumbnails_high: item.snippet.thumbnails.high.url,
            },
          });

          if (youtubeData) {
            const youtubeStats = await this.prisma.youtube_stats.upsert({
              where: {
                youtube_id: item.id,
              },
              update: {
                user_id: user_id,
                view_count: item.statistics.viewCount,
                video_count: item.statistics.videoCount,
                subscriber_count: item.statistics.subscriberCount,
                hidden_subscriber_count: item.statistics.hiddenSubscriberCount,
              },
              create: {
                youtube_id: item.id,
                user_id: user_id,
                view_count: item.statistics.viewCount,
                video_count: item.statistics.videoCount,
                subscriber_count: item.statistics.subscriberCount,
                hidden_subscriber_count: item.statistics.hiddenSubscriberCount,
              },
            });
          }
        }
        return JSON.stringify(items);
      });
    } else {
      this.comonError("err");
    }
    return "";
  }

  async getTokenForCode(code: string): Promise<IYTToken> {
    const { tokens } = await this.auth.getToken(code);
    if (tokens) {
      return tokens;
    }
  }

  async setYTAuth(id, userId, access_token, refresh_token, expiry_date): Promise<any> {
    const ytAuthData = await this.prisma.google_yt_auth.upsert({
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
    return ytAuthData;
  }

  /**
   * @desc using default forbidden error
   * @param msg
   * @pending need to handle the error types properly and
   * avoid common forbidden method.
   */
  comonError(msg: string): void {
    throw new ForbiddenException(msg);
  }
}
