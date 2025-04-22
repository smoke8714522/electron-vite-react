import React, { ReactNode } from 'react';
import { Button, CircularProgress } from '@mui/material';

interface ActionButtonProps {
  icon: ReactNode;
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  loading = false,
  disabled = false,
  onClick,
}) => {
  return (
    <Button
      variant="contained"
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : icon}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {label}
    </Button>
  );
};

export default ActionButton; 