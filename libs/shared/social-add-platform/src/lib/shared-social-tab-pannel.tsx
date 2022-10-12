import Typography from "@mui/material/Typography";

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  
export const TabPanel = (props: TabPanelProps) => {
    const { children, value, index, ...other } = props;
  
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
            <Typography>{children}</Typography>
        )}
      </div>
    );
  }