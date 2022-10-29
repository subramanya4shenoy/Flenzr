import { gql } from '@apollo/client';

export const DISABLE_YT_CHANNEL = gql`
mutation($youtube_id: String!) {
    disableYTChannel(youtube_id: $youtube_id)
}
`