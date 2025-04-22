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

// Placeholder Types for getVersions (if not defined elsewhere)
export interface GetVersionsPayload {
  masterId: number;
}

// Define generic API response structure
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
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
  getVersions: (payload: GetVersionsPayload) => Promise<GetVersionsResponse>;
  addToGroup: (payload: AddToGroupPayload) => Promise<ApiResponse<null>>;
  getThumbnailUrl: (assetId: number) => string;
  // Add other API methods here
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
} 

export type BulkImportResponse = ApiResponse<BulkImportResult>;
export type GetVersionsResponse = ApiResponse<Asset[]>;
export type AddToGroupResponse = ApiResponse<null>; 