import { gql } from "@apollo/client";

export const FACEBOOK_SIGN_IN = gql`
mutation($credential: String!) {
  signInWithFb(input:{
        credential: $credential
    }) {
        token
        user{
          display_name
          email
        }
      } 
}
`;
