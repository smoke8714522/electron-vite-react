import React, { useEffect } from 'react';
import {
  Box,
  Stack,
  Typography,
  IconButton,
  Card,
  CardMedia,
  Tooltip,
  CircularProgress,
  Collapse,
  Divider,
  Alert,
} from '@mui/material';
import {
  ArrowUpward as PromoteIcon,
  LinkOff as DetachIcon,
  AddCircleOutline as AddIcon,
} from '@mui/icons-material';

import type { Asset } from '../../types/api'; // Adjust path if needed
import {
  useGetVersions,
  usePromoteVersion,
  useRemoveFromGroup,
  useCreateVersion,
} from '../../hooks/useApi'; // Adjust path if needed

interface VersionPanelProps {
  masterAssetId: number;
  open: boolean; // Controlled by parent (AssetCard)
  onVersionsChange: () => void; // Callback to notify parent of changes
}

const VersionPanel: React.FC<VersionPanelProps> = ({
  masterAssetId,
  open,
  onVersionsChange,
}) => {
  const {
    data: versions,
    loading: loadingVersions,
    error: versionsError,
    call: fetchVersions,
  } = useGetVersions();

  const { call: promoteVersion, loading: promoting } = usePromoteVersion();
  const { call: removeFromGroup, loading: removing } = useRemoveFromGroup();
  const { call: createVersion, loading: creating } = useCreateVersion();

  useEffect(() => {
    if (open && masterAssetId) {
      fetchVersions({ masterId: masterAssetId });
    }
  }, [open, masterAssetId, fetchVersions]);

  const handlePromote = async (versionId: number) => {
    if (promoting || removing || creating) return;
    const response = await promoteVersion({ versionId });
    if (response.success) {
      console.log("Version promoted successfully");
      onVersionsChange();
    } else {
      console.error("Failed to promote version:", response.error);
    }
  };

  const handleRemove = async (versionId: number) => {
    if (promoting || removing || creating) return;
    // TODO: Add confirmation dialog?
    const response = await removeFromGroup({ versionId });
    if (response.success) {
      console.log("Version removed from group successfully");
      onVersionsChange();
    } else {
      console.error("Failed to remove version:", response.error);
    }
  };

  const handleAddVersion = async () => {
    if (promoting || removing || creating) return;
    // TODO: Implement file selection if needed
    const response = await createVersion({ masterId: masterAssetId });
    if (response.success) {
      console.log("New version created successfully");
      onVersionsChange();
    } else {
      console.error("Failed to create version:", response.error);
    }
  };

  const isLoading = loadingVersions || promoting || removing || creating;

  return (
    <Collapse in={open} timeout="auto" unmountOnExit>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ p: 1, position: 'relative', minHeight: 100 }}>
        {loadingVersions && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!loadingVersions && versionsError && (
          <Alert severity="error" sx={{ m: 1 }}>
            Error loading versions: {versionsError}
          </Alert>
        )}

        {!loadingVersions && !versionsError && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflowX: 'auto', pb: 1 }}>
            <Typography variant="caption" sx={{ flexShrink: 0, mr: 1, color: 'text.secondary', alignSelf: 'center' }}>
              Versions:
            </Typography>
            {versions?.map((version) => (
              <Tooltip key={version.id} title={`Version ${version.version_no}: ${version.fileName}`}>
                <Card sx={{ width: 60, height: 60, position: 'relative', flexShrink: 0, opacity: (promoting || removing || creating) ? 0.5 : 1 }}>
                  <CardMedia
                    component="img"
                    image={version.thumbnailPath || './placeholder.png'}
                    alt={`Version ${version.version_no}`}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      bgcolor: 'rgba(0,0,0,0.6)', display: 'flex',
                      justifyContent: 'space-around', py: '1px',
                      opacity: 0,
                      transition: 'opacity 0.2s ease-in-out',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    <Tooltip title="Promote to Master">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handlePromote(version.id)}
                          disabled={isLoading}
                          sx={{ color: 'white', p: '2px' }}
                        >
                          <PromoteIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Remove from Group">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleRemove(version.id)}
                          disabled={isLoading}
                          sx={{ color: 'white', p: '2px' }}
                        >
                          <DetachIcon fontSize="inherit" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Card>
              </Tooltip>
            ))}

            <Tooltip title="Add New Version">
              <span>
                <IconButton
                  onClick={handleAddVersion}
                  disabled={isLoading}
                  sx={{
                    border: '1px dashed', borderColor: 'divider',
                    width: 60, height: 60, borderRadius: 1,
                    ml: 1, flexShrink: 0
                  }}
                >
                  <AddIcon />
                </IconButton>
              </span>
            </Tooltip>

            {versions?.length === 0 && !loadingVersions && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                No other versions.
              </Typography>
            )}
          </Stack>
        )}
      </Box>
    </Collapse>
  );
};

export default VersionPanel; 