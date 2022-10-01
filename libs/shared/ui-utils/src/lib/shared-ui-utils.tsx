import HmacSHA256 from 'crypto-js/hmac-sha256';
import Base64Url from 'crypto-js/enc-base64url';
import EncUtf8 from 'crypto-js/enc-utf8'

const CreateJWT = (data: any) => {
  const header = convertBase64EN(`{"alg": "HS256", "typ": "JWT"}`);
  const payload = convertBase64EN(JSON.stringify(data));
  const secret = process.env["NX_JWT_SECRET"] as string;
  const sign = HmacSHA256(header + "." + payload, secret);
  const sign64 = Base64Url.stringify(sign);
  const jwt = header + "." + payload + "." + sign64;
  return jwt;
}


const convertBase64EN = (data: any) => {
  const wordArr = EncUtf8.parse(data);
  const result = Base64Url.stringify(wordArr);
  return result;
}

export { CreateJWT, convertBase64EN}