import { useMutation, useQuery } from "@apollo/client";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GET_USER_ABOUT } from "../graphql/getAbout.query";
import { SET_USER_ABOUT } from "../graphql/setAbout.mutation";
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CircularProgress from "@mui/material/CircularProgress";

export function SharedSocialAddAbout() {
  const { t } = useTranslation();
  const [about, setAbout] = useState("");
  const [storedAbout, setStoredAbout] = useState("");
  const {data, loading, error, refetch} = useQuery(GET_USER_ABOUT, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => { updateAboutValues(data)},
    onError: (err) => { setAbout(''); }
  });

  const updateAboutValues = ({getUserInfo}:any) =>{
    if(!getUserInfo){
      setAbout('');
      setStoredAbout('');
    } else {
      setAbout(getUserInfo.about); 
      setStoredAbout(getUserInfo.about)
    }
  }
  
  const [updateUserAbout, {data:setData, loading:setLoading, error:setError}] = useMutation(SET_USER_ABOUT, {
    variables: {'infoTxt': about},
    onCompleted: (setData) => { setAbout(setData.updateUserAbout.about);  refetch() }
  })
  
  return (
    <div>
      <TextField
            color="primary"
            autoFocus={true}
            id="about"
            multiline
            maxRows={4}
            value={about}
            type="text"
            margin="normal"
            sx={{
              background: "#F2F4F8",
              borderColor: "#F2F4F8",
              borderRadius: "16px",
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "transparent",
                },
                "&:hover fieldset": {
                  borderColor: "transparent",
                }
              },
            }}
            className="w-full"
            onChange={(e) => setAbout(e.target.value)}
          />
      <div className='flex justify-end'>
    {(loading || setLoading) ? <CircularProgress/> : 
    <Button sx={{mr: 1}} 
            variant="contained"
            disabled = {storedAbout === about}
            color="primary"
            startIcon={(storedAbout !== about) ? <SendIcon/> : <DoneAllIcon color="success"/>}
            onClick={() => {updateUserAbout()}}>
             { (storedAbout !== about) ? t('update'): t('All updated')}
    </Button>}
  </div>
    </div>
  );
};


export default SharedSocialAddAbout;
