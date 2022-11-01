import { gql } from "@apollo/client";

export const GET_USER_ABOUT = gql`
  query {
    getUserInfo {
      about
      rating
      style
      user_id
    }
  }
`;
