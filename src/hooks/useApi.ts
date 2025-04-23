import { useState, useCallback } from 'react';
import type {
  ApiResponse,
  GetAssetsResponse,
  CreateAssetPayload,
  CreateAssetResponse,
  UpdateAssetPayload,
  UpdateAssetResponse,
  DeleteAssetPayload,
  DeleteAssetResponse,
  BulkImportAssetsResponse,
  BulkUpdatePayload,
  BulkUpdateResponse,
  GetVersionsPayload,
  GetVersionsResponse,
  AddToGroupPayload,
  AddToGroupResponse,
  IElectronAPI,
  CreateVersionPayload,
  CreateVersionResponse,
  PromoteVersionPayload,
  PromoteVersionResponse,
  RemoveFromGroupPayload,
  RemoveFromGroupResponse
} from '../types/api';

// Augment the Window interface
declare global {
  interface Window {
    api: IElectronAPI;
    // // Optional: keep ipcRenderer if needed, otherwise remove
    // ipcRenderer: {
    //   send: (channel: string, data?: any) => void;
    //   invoke: (channel: string, ...args: any[]) => Promise<any>;
    //   on: (channel: string, func: (...args: any[]) => void) => void;
    //   off: (channel: string, func: (...args: any[]) => void) => void;
    // };
  }
}

// --- Define stable API call functions ---
// Ensure window.api exists before calling
const safeApiCall = <P, R>(method: (payload: P) => Promise<ApiResponse<R>>) => 
  (payload: P): Promise<ApiResponse<R>> => {
    if (!window.api) {
      console.error("Attempted to call API before it was ready/exposed.");
      return Promise.resolve({ success: false, error: 'API bridge not available' });
    }
    return method(payload);
};

const getAssetsApi = safeApiCall(window.api.getAssets);
const createAssetApi = safeApiCall<CreateAssetPayload, CreateAssetResponse['data']>(window.api.createAsset);
const updateAssetApi = safeApiCall<UpdateAssetPayload, UpdateAssetResponse['data']>(window.api.updateAsset);
const deleteAssetApi = safeApiCall<DeleteAssetPayload, DeleteAssetResponse['data']>(window.api.deleteAsset);
const bulkImportAssetsApi = safeApiCall<void, BulkImportAssetsResponse['data']>(window.api.bulkImportAssets);
const getVersionsApi = safeApiCall<GetVersionsPayload, GetVersionsResponse['data']>(window.api.getVersions);
const addToGroupApi = safeApiCall<AddToGroupPayload, AddToGroupResponse['data']>(window.api.addToGroup);
const createVersionApi = safeApiCall<CreateVersionPayload, CreateVersionResponse['data']>(window.api.createVersion);
const promoteVersionApi = safeApiCall<PromoteVersionPayload, PromoteVersionResponse['data']>(window.api.promoteVersion);
const removeFromGroupApi = safeApiCall<RemoveFromGroupPayload, RemoveFromGroupResponse['data']>(window.api.removeFromGroup);
const bulkUpdateAssetsApi = safeApiCall<BulkUpdatePayload, BulkUpdateResponse['data']>(window.api.bulkUpdateAssets);

// --- Hook Implementation --- //

// Generic hook to handle async API calls with loading/error states
function useAsyncCall<TResponseData = unknown, TPayload = any>(
  apiCall: (payload: TPayload) => Promise<ApiResponse<TResponseData>>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TResponseData | null>(null);

  const call = useCallback(
    async (...args: TPayload extends void ? [] : [TPayload]): Promise<ApiResponse<TResponseData>> => {
      const payload = args[0] as TPayload;
      setLoading(true);
      setError(null);
      setData(null);
      try {
        // Safety check moved to the api function definitions above
        const response = await apiCall(payload);
        if (response.success) {
          setData(response.data ?? null);
        } else {
          setError(response.error || 'An unknown API error occurred');
        }
        setLoading(false);
        return response;
      } catch (err: any) {
        console.error('API Call Error:', err);
        const message = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(message);
        setLoading(false);
        return { success: false, error: message };
      }
    },
    [apiCall] // Dependency on the stable apiCall function reference
  );

  return { loading, error, data, call };
}

// --- Specific API Hooks --- //

export function useGetAssets() {
  return useAsyncCall<GetAssetsResponse['data'], any | undefined>(getAssetsApi);
}

export function useCreateAsset() {
  return useAsyncCall<CreateAssetResponse['data'], CreateAssetPayload>(createAssetApi);
}

export function useUpdateAsset() {
  return useAsyncCall<UpdateAssetResponse['data'], UpdateAssetPayload>(updateAssetApi);
}

export function useDeleteAsset() {
  return useAsyncCall<DeleteAssetResponse['data'], DeleteAssetPayload>(deleteAssetApi);
}

export function useBulkImportAssets() {
  return useAsyncCall<BulkImportAssetsResponse['data'], void>(bulkImportAssetsApi);
}

export function useGetVersions() {
  return useAsyncCall<GetVersionsResponse['data'], GetVersionsPayload>(getVersionsApi);
}

export function useAddToGroup() {
  return useAsyncCall<AddToGroupResponse['data'], AddToGroupPayload>(addToGroupApi);
}

export function useCreateVersion() {
  return useAsyncCall<CreateVersionResponse['data'], CreateVersionPayload>(createVersionApi);
}

export function usePromoteVersion() {
  return useAsyncCall<PromoteVersionResponse['data'], PromoteVersionPayload>(promoteVersionApi);
}

export function useRemoveFromGroup() {
  return useAsyncCall<RemoveFromGroupResponse['data'], RemoveFromGroupPayload>(removeFromGroupApi);
}

export function useBulkUpdateAssets() {
  return useAsyncCall<BulkUpdateResponse['data'], BulkUpdatePayload>(bulkUpdateAssetsApi);
}

// Example of a combined hook (alternative approach)
// export function useApi() {
//   const getAssetsState = useGetAssets();
//   const createAssetState = useCreateAsset();
//   const updateAssetState = useUpdateAsset();
//   const deleteAssetState = useDeleteAsset();

//   return {
//     getAssets: getAssetsState.call,
//     getAssetsLoading: getAssetsState.loading,
//     getAssetsError: getAssetsState.error,
//     getAssetsData: getAssetsState.data,

//     createAsset: createAssetState.call,
//     // ... etc.
//   };
// } 