import { useLazyQuery } from '@apollo/client';
import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';
import { ADD_YT_AUTH_URL } from '../graphql/social-yt';

const SharedYtAddBtn = () => {
  const { t } = useTranslation();
  const [getRedirectionUrl, { loading, error, data, refetch, networkStatus }] = useLazyQuery(ADD_YT_AUTH_URL, 
    { 
      fetchPolicy: "network-only",
      onCompleted: (data) => {redirection(data)}
    }
  );

  const redirection = ({addNewYTChannel}: any) => {
    if(addNewYTChannel) {
      console.log(addNewYTChannel);
      (window as any).location.replace(addNewYTChannel);
    }
  }

  if(loading) { return <>Loading</> }
  if(error) { return <>error</> }

  return <>
  <div> list of channels </div>
  <Button sx={{m:4}} 
                 variant="contained" 
                 onClick={() => {getRedirectionUrl()}}
                 color="success">
    {t('addYtChannel')}
  </Button>
  </>;
};

export default SharedYtAddBtn;
