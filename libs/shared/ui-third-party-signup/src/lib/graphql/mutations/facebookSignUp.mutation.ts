import { gql } from "@apollo/client";

export const FACEBOOK_SIGN_UP = gql`
mutation($credential: String!) {
    signUpWithFb(input:{
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
