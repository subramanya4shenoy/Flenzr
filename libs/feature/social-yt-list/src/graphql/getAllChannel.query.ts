
import { gql } from '@apollo/client';

export const GET_ALL_CHANNELS = gql`
  query{
      getAllYTChannelDetailsOfUSer{
        youtube_id
        title
        description
        thumbnails_default
      }
  }  
  
`;