import { gql } from "@apollo/client";

export const GOOGLE_SIGN_UP = gql`
mutation($clientId: String!, $credential: String!) {
    signUpWithGoogle(input:{
        clientId: $clientId,
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
