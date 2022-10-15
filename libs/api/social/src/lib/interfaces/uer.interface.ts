interface IUser {
  user_id: number;
  email: string;
  verified: boolean;
  source: string;
  mobile_verified: boolean;
  location: string;
  language: string;
  created_ip: string;
  display_name: string;
  device_id: string;
  name: string;
  mobile: string;
  created_datetime: string;
  dp_source: string;
  iat: number;
  exp: number;
}

export default IUser;
