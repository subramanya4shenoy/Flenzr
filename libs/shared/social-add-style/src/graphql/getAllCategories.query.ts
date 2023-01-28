// graphql query for getting all categories

import { gql } from '@apollo/client';

export const GET_ALL_CATEGORIES = gql`
    query{
        getAllCategory{
            category
            id
            subcategory {
              subcategory
              id
            }
        }       
    }
`;