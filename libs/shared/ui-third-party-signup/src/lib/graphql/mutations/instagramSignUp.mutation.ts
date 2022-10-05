import { gql } from "@apollo/client";

export const INSTAGRAM_SIGN_UP = gql`
mutation($credential: String!) {
    signUpWithInsta(input:{
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
