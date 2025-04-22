import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  Stack,
} from '@mui/material';

interface BulkEditModalProps {
  open: boolean;
  selectedIds: number[];
  onClose: () => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ open, selectedIds, onClose }) => {
  const [year, setYear] = useState('');
  const [applyYear, setApplyYear] = useState(false);
  const [advertiser, setAdvertiser] = useState('');
  const [applyAdvertiser, setApplyAdvertiser] = useState(false);
  const [niche, setNiche] = useState('');
  const [applyNiche, setApplyNiche] = useState(false);
  const [shares, setShares] = useState('');
  const [applyShares, setApplyShares] = useState(false);

  const handleSave = () => {
    const updates: Record<string, any> = {};
    if (applyYear) updates.year = parseInt(year, 10) || null;
    if (applyAdvertiser) updates.advertiser = advertiser;
    if (applyNiche) updates.niche = niche;
    if (applyShares) updates.shares = parseInt(shares, 10) || 0;

    console.log('Saving Bulk Edit for IDs:', selectedIds);
    console.log('Applying updates:', updates);
    // TODO: Implement actual save logic via API call
    onClose(); // Close modal after logging
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Edit {selectedIds.length} Assets</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControlLabel
            control={
              <Checkbox checked={applyYear} onChange={(e) => setApplyYear(e.target.checked)} />
            }
            label="Year"
          />
          <TextField
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            disabled={!applyYear}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox checked={applyAdvertiser} onChange={(e) => setApplyAdvertiser(e.target.checked)} />
            }
            label="Advertiser"
          />
          <TextField
            label="Advertiser"
            value={advertiser}
            onChange={(e) => setAdvertiser(e.target.value)}
            disabled={!applyAdvertiser}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox checked={applyNiche} onChange={(e) => setApplyNiche(e.target.checked)} />
            }
            label="Niche"
          />
          <TextField
            label="Niche"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            disabled={!applyNiche}
            fullWidth
            size="small"
          />

          <FormControlLabel
            control={
              <Checkbox checked={applyShares} onChange={(e) => setApplyShares(e.target.checked)} />
            }
            label="Shares"
          />
          <TextField
            label="Shares"
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            disabled={!applyShares}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={selectedIds.length === 0}>
          Apply to {selectedIds.length} Assets
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkEditModal; 