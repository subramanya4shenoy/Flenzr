import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';

/* eslint-disable-next-line */
export interface SharedUiCustomSelectProps {
  list: Array<string>;
  selectedOption:string;
  color: string;
  onChangeSelection(e:any): void;
}

export function SharedUiCustomSelect({
  list,
  selectedOption,
  color,
  onChangeSelection,
}: SharedUiCustomSelectProps) {
  return (
    <Select
      labelId="user-select"
      id="user-select"
      value={selectedOption}
      onChange={(e) => {
        onChangeSelection(e.target.value);
      }}
      sx={{
        width: 120,
        fontSize: 12, 
        height: 35,
        borderRadius: 27,
        border: "2px solid " + color,
        backgroundColor: color,
        outlineColor: 'transparent',
        color: "#fff",
        "& .MuiSvgIcon-root": {
          color: "#fff",
          opacity: '60%'
      }
      }}
    >
      {list.map((type: string, key: number) => {
        return (
          <MenuItem value={type} key={'type_' + key} data-testid="select-option">
            {type}
          </MenuItem>
        );
      })}
    </Select>
  );
}

export default SharedUiCustomSelect;
