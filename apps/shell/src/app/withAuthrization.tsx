import { Query } from '@apollo/client/react/components';
import { gql } from "@apollo/client";

export const GET_ME = gql`
query {
    me
}
`;
const authCheck = (Component:any, props:any, refetch:any, data:any, PageName:any) => {
    const { me: { subscription } } = data;
    // console.log("subscription=>",subscription);
    if (!subscription) {
      return <Component {...props} session={data} />
    }
    if (subscription) {
      const { status, end_at, remaining_count } = subscription;
      const ignorePages = ['Home', 'ProfilePage', 'OrderPage', 'TransactionPage'];
  
      if (status === 'active' && (ignorePages.indexOf(PageName) < 0)) {
        // navigate(routes.HOME, {replace: true});
        return <Component {...props} session={data} />
      }
      // console.log(status, end_at, remaining_count);
      return <Component {...props} session={data} refetch={refetch} subscription={subscription} />
    }
    return <Component {...props} session={data} refetch={refetch} />
  }
  
  
  const withAuthorization = (conditionFn:any) => (Component:any, PageName = 'allowAccess') => (props:any) => (
  
    <Query query={GET_ME} fetchPolicy="network-only">
      {({ data, networkStatus, refetch }: any) => {
        if (networkStatus < 7) {
          return null;
        }
  
        return conditionFn(data) ? (
          authCheck(Component, props, refetch, data, PageName)
        ) : (
          <Component {...props} session={null} />
        );
  
      }}
    </Query>
  );

export default withAuthorization;
