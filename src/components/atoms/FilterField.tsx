import React, { ReactNode } from 'react';
import { ListItem, ListItemIcon, ListItemText, TextField } from '@mui/material';

interface FilterFieldProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number';
}

const FilterField: React.FC<FilterFieldProps> = ({
  icon,
  label,
  value,
  onChange,
  type = 'text',
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(type === 'number' ? parseInt(event.target.value, 10) || 0 : event.target.value);
  };

  return (
    <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <ListItemIcon sx={{ minWidth: 'auto' }}>{icon}</ListItemIcon>
      <ListItemText primary={label} sx={{ flex: '0 0 80px' }} />
      <TextField
        variant="outlined"
        size="small"
        type={type}
        value={value}
        onChange={handleChange}
        fullWidth
        InputLabelProps={{
          shrink: true,
        }}
      />
    </ListItem>
  );
};

export default FilterField; 