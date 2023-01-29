import styles from "./shared-social-add-style.module.scss";
import Chip from "@mui/material/chip";
import { GET_ALL_CATEGORIES } from "../graphql/getAllCategories.query";
import { useQuery } from "@apollo/client/react/hooks/useQuery";
import { useState } from "react";
import { AddCircle, DeleteOutlineRounded } from "@mui/icons-material";
import Button from "@mui/material/Button";

/* eslint-disable-next-line */
export interface SharedSocialAddStyleProps {}

export function SharedSocialAddStyle(props: SharedSocialAddStyleProps) {

  const [selected, setSelected] = useState<number[]>([]);
  const { data, loading, error } = useQuery(GET_ALL_CATEGORIES);

  const handleClick = (id:number) => {
    if(selected.includes(id)) return;
    else setSelected([...selected, id]);
  };

  const handleIconClick = (id:number) => {
    if(selected.includes(id)) {
      const newSelected = selected.filter((item) => item !== id);
      setSelected(newSelected);
    } else {
      setSelected([...selected, id]);
    }
  };  

  return (
    <div className={styles["container"]}>
      {(loading) && <div>Loading...</div>}
      {(data && data.getAllCategory) && data.getAllCategory.map((category: any, index:number) => {
        return <div className="m-1" key={index+"_"+category.id}>
          <Chip
          color="primary"
          label={category.category}
          onClick={() => { handleClick(category.id) }}
          onDelete={() => { handleIconClick(category.id)}}
          variant={selected.includes(category.id) ? "filled" : "outlined"}
          deleteIcon={selected.includes(category.id) ? <DeleteOutlineRounded/> : <AddCircle/>}/>
            {selected.includes(category.id) && 
              <div className="flex flex-wrap">
              {category.subcategory.map((subCategory:any, index:number) => {
                return <div  className="m-1" key={index+"_"+subCategory.id}>
                  <Chip
                  color="success"
                  label={subCategory.subcategory}
                  onClick={() => { handleClick(subCategory.id) }}
                  onDelete={() => { handleIconClick(subCategory.id)}}
                  variant={selected.includes(subCategory.id) ? "filled" : "outlined"}
                  deleteIcon={selected.includes(subCategory.id) ? <DeleteOutlineRounded/> : <AddCircle/>}/>
                </div>
              })}
              </div>
            }
        </div>
      } )}  
      <div className="flex justify-end">
        <Button className="btn btn-primary flex justify-end" variant="contained" disabled={selected.length === 0}>
          <span>Add {(selected.length > 0) && <span>{selected.length}</span>} Style{(selected.length > 1) && <span>s</span>}</span>
        </Button>
      </div> 
    </div>
  );
}

export default SharedSocialAddStyle;
