import { ForbiddenException, Injectable } from "@nestjs/common";
import { google } from "googleapis";
import { YT_CONFIG } from "../../config/youtube.config";
import IYTChannelDetails from "../../interfaces/youtube-channel-detail.interface";
import IYTToken from "../../interfaces/youtube-token.interface";
import { YoutubeChannel } from "../../models/youtubeChannel.model";
import { YTDBService } from "./youtube.db.services";

@Injectable()
export class YTService {
  constructor(private ytDBServices:YTDBService) {}
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

  async setChannelDetails(code: string, user_id: number): Promise<any> {
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
      items.forEach((item: IYTChannelDetails) => {
        const storeToken = this.ytDBServices.setYTAuth(
          item.id,
          user_id,
          access_token,
          refresh_token,
          expiry_date
        );
        if (storeToken) {
          const youtubeData = this.ytDBServices.setYTData(user_id, item);
          if (youtubeData) {
            const youtubeStats = this.ytDBServices.setYTStats(user_id, item);
            if(youtubeStats) {
              return youtubeStats;
            }
          }
        }
      });
    } else {
      this.comonError("err");
    }
  }

  async getTokenForCode(code: string): Promise<IYTToken> {
    const { tokens } = await this.auth.getToken(code);
    if (tokens) {
      return tokens;
    }
  }

  async getAllChannelsDetailsOfUser(user_id): Promise<YoutubeChannel[]> {
    const data = await this.ytDBServices.getAllYTChannel(user_id);
    return data;
  }

  async disableYtChannel(channel_id: string): Promise<YoutubeChannel> {
    return await this.ytDBServices.disableYTChannel(channel_id);
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
