import { gql } from "@apollo/client";

export const GOOGLE_SIGN_IN = gql`
query($clientId: String!, $credential: String!) {
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
