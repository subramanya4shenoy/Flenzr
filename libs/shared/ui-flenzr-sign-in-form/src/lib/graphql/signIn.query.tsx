import { gql } from '@apollo/client';

export const SIGN_IN = gql`
query($email: String!, $password: String!) {
  signIn(input:{password: $password, email: $email}) {
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