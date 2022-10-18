import { PrismaService } from "@flenzr/api/auth";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { google } from "googleapis";
import IYTToken from "../interfaces/youtube-token.interface";
@Injectable()
export class YTService {
  
  constructor(private prisma: PrismaService) {}
  private auth: any;

  async addYoutubeChannel() {
    this.auth = new google.auth.OAuth2(
      process.env.NX_GOOGLE_AUTH_UI_CLIENT_ID,
      process.env.NX_GOOGLE_CLIENT_SECRET,
      "https://localhost:4200/googleauth"
    );
    const scopes = ['https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtubepartner',
    'https://www.googleapis.com/auth/youtubepartner-channel-audit'];
    // Generate a url that asks permissions for the Drive activity scope
    const authorizationUrl = await this.auth.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      include_granted_scopes: true,
    });
    return authorizationUrl;
  }

  async setChannelDetails(code: string): Promise<string> {
    const {access_token, refresh_token}:any = await this.getTokenForCode(code);
    const youtube = google.youtube('v3');
    const {status, data}  = await youtube.channels.list({
      part: ["snippet,contentDetails,statistics"],
      key: process.env.NX_GOOGLE_YT_API_KEY,
      mine: true,
      access_token: access_token,
    })
    if(status === 200 && data) {
      const { items } = data;
      return JSON.stringify(items);
    } else {
      this.comonError("err");
    }
  }

  async getTokenForCode(code: string): Promise<IYTToken> {
    const { tokens } = await this.auth.getToken(code);
    if(tokens) { return tokens; }
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