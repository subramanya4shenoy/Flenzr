import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

/* eslint-disable-next-line */
export interface SharedUiCustomSelectProps {
  list: Array<string>;
  selectedOption: any;
  color: string;
  onChangeSelection: any;
}

export function SharedUiCustomSelect({
  list,
  selectedOption,
  color,
  onChangeSelection,
}: SharedUiCustomSelectProps) {
  return (
    <Select
      labelId="demo-simple-select-label"
      id="demo-simple-select"
      value={selectedOption}
      onChange={(e) => {
        onChangeSelection(e.target.value);
      }}
      sx={{
        width: 100,
        fontSize: 16,
        height: 35,
        borderRadius: 27,
        color: { color },
        fontWeight: 'bold',
      }}
    >
      {list.map((type: any, key: number) => {
        return (
          <MenuItem value={type} key={'type_' + key}>
            {type}
          </MenuItem>
        );
      })}
    </Select>
  );
}

export default SharedUiCustomSelect;
