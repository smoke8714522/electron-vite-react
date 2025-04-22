import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Stack,
    CircularProgress,
    Alert,
} from '@mui/material';
import type { Asset } from '../../types/api';
import { useUpdateAsset } from '../../hooks/useApi';

interface TagEditorModalProps {
    asset: Asset | null; // Pass the full asset object to edit
    open: boolean;
    onClose: () => void;
    onSaveSuccess: (updatedAsset: Partial<Asset>) => void; // Callback on successful save
}

const TagEditorModal: React.FC<TagEditorModalProps> = ({
    asset,
    open,
    onClose,
    onSaveSuccess,
}) => {
    // State for form fields
    const [year, setYear] = useState<string>('');
    const [advertiser, setAdvertiser] = useState<string>('');
    const [niche, setNiche] = useState<string>('');
    const [shares, setShares] = useState<string>('');
    // Add state for custom fields later if needed

    const { call: updateAsset, loading, error } = useUpdateAsset();

    // Effect to populate form when asset prop changes (modal opens)
    useEffect(() => {
        if (asset) {
            setYear(asset.year?.toString() ?? '');
            setAdvertiser(asset.advertiser ?? '');
            setNiche(asset.niche ?? '');
            setShares(asset.shares?.toString() ?? '0');
        } else {
            // Reset form if no asset (or modal closes)
            setYear('');
            setAdvertiser('');
            setNiche('');
            setShares('0');
        }
    }, [asset]); // Depend on the asset object

    const handleSave = async () => {
        if (!asset) return;

        // Prepare the update payload
        const updatedFields: Partial<Omit<Asset, 'id' | 'createdAt'>> = {};
        const currentYear = asset.year?.toString() ?? '';
        const currentAdvertiser = asset.advertiser ?? '';
        const currentNiche = asset.niche ?? '';
        const currentShares = asset.shares?.toString() ?? '0';

        // Only include fields that have actually changed
        if (year !== currentYear) updatedFields.year = year === '' ? null : parseInt(year, 10);
        if (advertiser !== currentAdvertiser) updatedFields.advertiser = advertiser === '' ? null : advertiser;
        if (niche !== currentNiche) updatedFields.niche = niche === '' ? null : niche;
        if (shares !== currentShares) updatedFields.shares = shares === '' ? 0 : parseInt(shares, 10);

        // Validate numeric fields
        if (updatedFields.year !== undefined && isNaN(updatedFields.year as number)) {
            console.error("Invalid Year"); // TODO: Show validation error to user
            return;
        }
        if (updatedFields.shares !== undefined && isNaN(updatedFields.shares as number)) {
            console.error("Invalid Shares"); // TODO: Show validation error to user
            return;
        }

        if (Object.keys(updatedFields).length > 0) {
            const response = await updateAsset({ id: asset.id, fields: updatedFields });
            if (response.success) {
                console.log('Asset updated successfully');
                onSaveSuccess({ id: asset.id, ...updatedFields }); // Notify parent
                onClose(); // Close modal on success
            }
            // Error handling is implicitly done by useAsyncCall hook (logs to console)
            // TODO: Display specific error from `error` state in the modal if needed
        } else {
            console.log('No changes detected, closing modal.');
            onClose(); // No changes, just close
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Tags for {asset?.fileName ?? 'Asset'}</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    {error && <Alert severity="error">Error updating asset: {error}</Alert>}
                    <TextField
                        label="Year"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                    />
                    <TextField
                        label="Advertiser"
                        value={advertiser}
                        onChange={(e) => setAdvertiser(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                    />
                    <TextField
                        label="Niche"
                        value={niche}
                        onChange={(e) => setNiche(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                    />
                    <TextField
                        label="Shares"
                        type="number"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        InputProps={{ inputProps: { min: 0 } }} // Ensure non-negative shares
                    />
                    {/* Add custom fields form elements here later */}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={loading}>
                    Cancel
                </Button>
                <Button onClick={handleSave} variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : 'Save'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TagEditorModal; 