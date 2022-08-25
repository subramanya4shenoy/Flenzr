import Chip from '@mui/material/Chip';

export function FeatureProfileCategory() {
  return (
    <div className="rounded-lg shadow-md p-4 bg-white">
      <div className="font-bold text-xs capitalize my-2">category</div>
      <div className="capitalize flex flex-wrap">
      <Chip label="comedy" color="primary" className="m-1" variant='outlined' />
      <Chip label="satire" color="primary" className="m-1" variant='outlined' />
      <Chip label="standup" color="primary" className="m-1" variant='outlined' />
      <Chip label="comedy" color="primary" className="m-1" variant='outlined' />
      <Chip label="prank" color="primary" className="m-1" variant='outlined' />
      </div>
    </div>
  );
};


export default FeatureProfileCategory;
