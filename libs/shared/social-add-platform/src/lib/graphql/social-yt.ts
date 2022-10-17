import { gql } from "@apollo/client";

export const ADD_YT_AUTH_URL = gql`
query {
    addNewYTChannel
}
`;


export const ADD_YT_CHANNEL = gql`
    mutation($code: String!) {
        setYTChannelDetails(code:$code)
    }
`