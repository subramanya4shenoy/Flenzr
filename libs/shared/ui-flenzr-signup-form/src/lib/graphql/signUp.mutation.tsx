import { gql } from "@apollo/client";

export const SIGN_UP = gql`
mutation($created_ip: String,
          $device_id: String,
          $display_name: String,
          $email: String!,
          $language: String,
          $location: String,
          $mobile: String,
          $name: String,
          $password: String!,
          $source: String
  ) {
    signUp(input:{
          created_ip: $created_ip,
          device_id: $device_id,
          display_name: $display_name,
          email: $email,
          language: $language,
          location: $location,
          mobile: $mobile,
          name: $name,
          password: $password,
          source: $source
    }) {
        token
        user{
          display_name
          email
        }
      }
}
`;
