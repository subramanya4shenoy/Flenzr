import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

export function SharedUiPasswordHelper({ checkString }: any) {
  return (
    (checkString.trim().length> 0) ?
    (<div className="text-xs capitalize flex my-3 flex-wrap items-center justify-start content-center">
      <div className="mr-2 opacity-50">password must be:</div>
      <div className="ml-4 flex items-center content-center justify-start">
        <div className="font-bold">4-20 charecter long</div>
        {(((checkString.trim().length) < 4) && ((checkString.trim().length) < 20)) ? (
          <CancelIcon className="ml-4" fontSize="small" color="error" />
        ) : (
          <CheckCircleIcon className="ml-4" fontSize="small" color="success" />
        )}
      </div>
    </div>) : 
    (<></>)
  );
}

export default SharedUiPasswordHelper;
