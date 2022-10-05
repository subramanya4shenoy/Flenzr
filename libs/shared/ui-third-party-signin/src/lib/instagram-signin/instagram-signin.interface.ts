export interface IInstaUserDetails {
    provider: string;
    data: {
      id: string;
      username: string;
      account_type: string;
      media_count: number;
      access_token: string;
      user_id: number;
    };
  }
  