export interface Asset {
  id: number;
  path: string;
  fileName: string;
  createdAt: string; // ISO 8601 date string
  mimeType: string;
  size: number;
  year?: number | null;
  advertiser?: string | null;
  niche?: string | null;
  shares: number;
  master_id?: number | null;
  version_no: number;
  thumbnailPath?: string;
}

// Placeholder for CustomField if needed later
// export interface CustomField {
//   id: number;
//   name: string;
//   type: string; // e.g., 'text', 'number', 'date'
// }

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Types for get-assets
export type GetAssetsResponse = ApiResponse<Asset[]>;

// Types for create-asset
export type CreateAssetPayload = Omit<
  Asset,
  'id' | 'createdAt' | 'version_no' | 'shares' | 'master_id'
>;
export type CreateAssetResponse = ApiResponse<Asset>;

// Types for update-asset
export interface UpdateAssetPayload {
  id: number;
  fields: Partial<Omit<Asset, 'id' | 'createdAt'>>;
}
export type UpdateAssetResponse = ApiResponse<Asset>;

// Types for delete-asset
export interface DeleteAssetPayload {
  id: number;
}
export type DeleteAssetResponse = ApiResponse<null>;

// Types for bulk-import-assets
export interface BulkImportError {
  filePath: string;
  reason: string;
}
export interface BulkImportResult {
  importedCount: number;
  errors: BulkImportError[];
}
export type BulkImportAssetsResponse = ApiResponse<BulkImportResult>;

// Payload for grouping assets
export interface AddToGroupPayload {
  sourceId: number; // The asset being dragged
  targetId: number; // The asset being dropped onto
}

// Types for get-versions
export interface GetVersionsPayload {
  masterId: number;
}
export type GetVersionsResponse = ApiResponse<Asset[]>;

// Types for create-version
export interface CreateVersionPayload {
  masterId: number; // ID of the asset to version
  filePath?: string; // Optional: path to a new file for this version
}
export interface CreateVersionResult {
  newAsset: Asset; // The newly created version asset details
}
export type CreateVersionResponse = ApiResponse<CreateVersionResult>;

// Types for promote-version
export interface PromoteVersionPayload {
  versionId: number; // ID of the version asset to promote to master
}
export type PromoteVersionResponse = ApiResponse<null>; // Success/fail indication

// Types for remove-from-group (make version independent)
export interface RemoveFromGroupPayload {
  versionId: number; // ID of the version asset to detach
}
export type RemoveFromGroupResponse = ApiResponse<null>; // Success/fail indication

// Types for add-to-group (make one asset a version of another)
export interface AddToGroupPayload {
  sourceId: number; // The asset ID being dragged (becomes the version)
  targetId: number; // The asset ID being dropped onto (becomes the master)
}
export type AddToGroupResponse = ApiResponse<null>; // Success/fail indication

// --- Bulk Update --- New
export interface BulkUpdatePayload {
    ids: number[];
    fields: Partial<Pick<Asset, 'year' | 'advertiser' | 'niche' | 'shares'>>; // Allow updating specific fields
}
export interface BulkUpdateResponse {
    updatedCount: number;
}

// --- Master Asset Search --- New
export interface GetMasterAssetsPayload {
    searchTerm?: string;
}
export interface GetMasterAssetsResponse {
    assets: Pick<Asset, 'id' | 'path'>[]; // Return only necessary fields
}

// --- File Dialog --- New
export interface OpenFileDialogResponse {
  filePaths?: string[]; // Array of selected file paths
  canceled: boolean;
}

// Ensure Asset type includes master_id and version_no
// ... existing code ...

// Interface for the API exposed via contextBridge
export interface IElectronAPI {
  getAssets: (filters?: any) => Promise<GetAssetsResponse>;
  createAsset: (payload: CreateAssetPayload) => Promise<CreateAssetResponse>;
  updateAsset: (payload: UpdateAssetPayload) => Promise<UpdateAssetResponse>;
  deleteAsset: (payload: DeleteAssetPayload) => Promise<DeleteAssetResponse>;
  bulkImportAssets: () => Promise<BulkImportAssetsResponse>;
  getThumbnailUrl: (assetId: number) => string;
  
  // Bulk Operations
  bulkUpdateAssets: (payload: BulkUpdatePayload) => Promise<ApiResponse<BulkUpdateResponse>>;
  
  // Add method for subscribing to view changes from main process menu
  // Takes a callback and returns a cleanup function
  onViewChange: (callback: (viewName: string) => void) => (() => void);
  
  // --- Versioning and Grouping API ---
  getVersions: (payload: GetVersionsPayload) => Promise<GetVersionsResponse>;
  createVersion: (payload: CreateVersionPayload) => Promise<CreateVersionResponse>;
  promoteVersion: (payload: PromoteVersionPayload) => Promise<PromoteVersionResponse>;
  removeFromGroup: (payload: RemoveFromGroupPayload) => Promise<RemoveFromGroupResponse>;
  addToGroup: (payload: AddToGroupPayload) => Promise<AddToGroupResponse>;
  getMasterAssets: (payload: GetMasterAssetsPayload) => Promise<ApiResponse<GetMasterAssetsResponse>>;
  // --- END Versioning and Grouping API ---
  
  // System / File Dialogs
  showOpenDialog: () => Promise<OpenFileDialogResponse>;
  
  // Add other API methods here
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
} 

// Helper types re-exported or defined if needed elsewhere
// export type BulkImportResponse = ApiResponse<BulkImportResult>; // Already exists, ensure consistent naming if used
// export type GetVersionsResponse = ApiResponse<Asset[]>; // REMOVED DUPLICATE
// export type AddToGroupResponse = ApiResponse<null>; // REMOVED DUPLICATE
