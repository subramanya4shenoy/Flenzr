import { Injectable } from "@nestjs/common";
import { google } from "googleapis";
@Injectable()
export class YTService {
  
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

  async setChannelDetails(code: string) {
    const {access_token, refresh_token}:any = this.getTokenForCode(code);
    const youtube = google.youtube('v3');
    youtube.channels.list({
      part: ["snippet,contentDetails,statistics"],
      mine: true,
      access_token: access_token,
    }).then((response) => {
      const { config }: any = response;
      return config;
    }, 
    (err) => {
      console.error("Execute error", err);
    })
    return;
  }

  async getTokenForCode(code: string): Promise<any> {
    const { tokens } = await this.auth.getToken(code);
    const onSuccess = await this.auth.setCredentials(tokens);
    if(onSuccess) {
      return {access_token: tokens.access_token, refresh_token:tokens.refresh_token}
    }
  }

}