import { gql } from "@apollo/client";

export const GOOGLE_SIGN_IN = gql`
mutation($clientId: String!, $credential: String!) {
  signInWithGoogle(input:{
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
