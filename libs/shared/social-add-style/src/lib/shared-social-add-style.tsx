import styles from "./shared-social-add-style.module.scss";
import Chip from "@mui/material/chip";
import DoneIcon from "@mui/icons-material/done";
import { GET_ALL_CATEGORIES } from "../graphql/getAllCategories.query";
import { useQuery } from "@apollo/client/react/hooks/useQuery";
import { useState } from "react";

/* eslint-disable-next-line */
export interface SharedSocialAddStyleProps {}

export function SharedSocialAddStyle(props: SharedSocialAddStyleProps) {

  //Empty array to hold selected array
  const [selected, setSelected] = useState([]);
  const { data, loading, error } = useQuery(GET_ALL_CATEGORIES);

  const handleClick = () => {
    console.info("You clicked the Chip.");
  };

  const handleDelete = () => {
    console.info("You clicked the delete icon.");
  };  

  return (
    <div className={styles["container"]}>
      {(loading) && <div>Loading...</div>}
      {(data && data.getAllCategory) && data.getAllCategory.map((category: any) => {
        return <div className="m-1">
          <Chip
          color="primary" 
          label={category.category}
          onClick={handleClick}
          onDelete={handleDelete}
          variant="outlined"
          deleteIcon={<DoneIcon />}/>
        </div>
      } )}      
    </div>
  );
}

export default SharedSocialAddStyle;
