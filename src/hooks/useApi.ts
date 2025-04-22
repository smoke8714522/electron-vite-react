import { useState, useCallback } from 'react';
import type {
  Asset,
  ApiResponse,
  GetAssetsResponse,
  CreateAssetPayload,
  CreateAssetResponse,
  UpdateAssetPayload,
  UpdateAssetResponse,
  DeleteAssetPayload,
  DeleteAssetResponse,
  BulkImportAssetsResponse,
  IElectronAPI
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
      return Promise.resolve({ success: false, error: 'API bridge not available' });
    }
    return method(payload);
};

const getAssetsApi = safeApiCall<any | undefined, GetAssetsResponse['data']>(window.api.getAssets);
const createAssetApi = safeApiCall<CreateAssetPayload, CreateAssetResponse['data']>(window.api.createAsset);
const updateAssetApi = safeApiCall<UpdateAssetPayload, UpdateAssetResponse['data']>(window.api.updateAsset);
const deleteAssetApi = safeApiCall<DeleteAssetPayload, DeleteAssetResponse['data']>(window.api.deleteAsset);
const bulkImportAssetsApi = safeApiCall<void, BulkImportAssetsResponse['data']>(window.api.bulkImportAssets);

// --- Hook Implementation --- //

interface AsyncState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

type AsyncFn<Args extends any[], Res> = (...args: Args) => Promise<{ success: boolean; data?: Res; error?: string }>;

// Generic hook to handle async API calls with loading/error states
// Adjust TPayload to handle void explicitly
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
  return useAsyncCall(getAssetsApi);
}

export function useCreateAsset() {
  return useAsyncCall(createAssetApi);
}

export function useUpdateAsset() {
  return useAsyncCall(updateAssetApi);
}

export function useDeleteAsset() {
  return useAsyncCall(deleteAssetApi);
}

export function useBulkImportAssets() {
  return useAsyncCall(bulkImportAssetsApi);
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