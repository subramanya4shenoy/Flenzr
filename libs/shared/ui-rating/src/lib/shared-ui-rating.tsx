import Rating from '@mui/material/Rating';
import { useState } from 'react';

export function SharedUiRating() {

  const [value, setValue] = useState<number | null>(2);

  return (
    <div className="rounded-lg shadow-md p-4 bg-white">
      <div className="font-bold text-xs capitalize my-2">rating</div>
      <Rating
        name="simple-controlled"
        value={value}
        onChange={(event, newValue) => {
          setValue(newValue);
        }}
        size="large" 
      />
    </div>
  );
};


export default SharedUiRating;
