export interface Asset {
  id: number;
  path: string;
  createdAt: string; // ISO 8601 date string
  mimeType: string;
  size: number;
  year?: number | null;
  advertiser?: string | null;
  niche?: string | null;
  shares: number;
  master_id?: number | null;
  version_no: number;
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
export type DeleteAssetResponse = ApiResponse;

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

// Interface for the API exposed via contextBridge
export interface IElectronAPI {
  getAssets: (filters?: any) => Promise<GetAssetsResponse>;
  createAsset: (payload: CreateAssetPayload) => Promise<CreateAssetResponse>;
  updateAsset: (payload: UpdateAssetPayload) => Promise<UpdateAssetResponse>;
  deleteAsset: (payload: DeleteAssetPayload) => Promise<DeleteAssetResponse>;
  bulkImportAssets: () => Promise<BulkImportAssetsResponse>;
  // Add other API methods here
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
} 