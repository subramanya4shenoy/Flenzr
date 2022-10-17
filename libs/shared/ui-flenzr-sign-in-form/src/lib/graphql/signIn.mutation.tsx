import { gql } from '@apollo/client';

export const SIGN_IN = gql`
mutation($email: String!, $password: String!, $location: String) {
  signIn(input:{password: $password, email: $email, location: $location}) {
    token
    user{
      display_name
      name
      email
      verified
    }
  }
}
`