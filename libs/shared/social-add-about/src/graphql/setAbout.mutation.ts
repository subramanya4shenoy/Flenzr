import { gql } from "@apollo/client";

export const SET_USER_ABOUT = gql`
  mutation($infoTxt: String!) {
    updateUserAbout(infoTxt:$infoTxt) {
        about
    }
  }
`;
