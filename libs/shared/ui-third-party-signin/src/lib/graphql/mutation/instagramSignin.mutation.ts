import { gql } from "@apollo/client";

export const INSTAGRAM_SIGN_IN = gql`
mutation($credential: String!) {
    signInWithInsta(input:{
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
