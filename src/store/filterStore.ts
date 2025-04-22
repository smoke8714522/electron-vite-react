import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';

// Define possible sort fields
type SortableField = 'createdAt' | 'year' | 'advertiser' | 'niche' | 'shares';
type SortOrder = 'asc' | 'desc';

interface FilterState {
  year?: number;
  advertiser?: string;
  niche?: string;
  sharesRange: [number, number]; // [min, max]
  searchTerm?: string;
}

// Add Sorting State
interface SortState {
  sortBy: SortableField;
  sortOrder: SortOrder;
}

// Add Selection State
interface SelectionState {
  selectedAssetIds: Set<number>; // Use a Set for efficient add/remove/check
}

interface FilterActions {
  setYear: (year?: number) => void;
  setAdvertiser: (advertiser?: string) => void;
  setNiche: (niche?: string) => void;
  setSharesRange: (range: [number, number]) => void;
  setSearchTerm: (term?: string) => void;
  resetFilters: () => void;
}

// Add Sorting Actions
interface SortActions {
  setSortBy: (field: SortableField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;
}

// Add Selection Actions
interface SelectionActions {
  setSelected: (ids: number[] | Set<number>) => void;
  addSelected: (id: number) => void;
  removeSelected: (id: number) => void;
  toggleSelected: (id: number) => void;
  clearSelection: () => void;
}

// Combine all state and action types
type AppState = FilterState & SortState & SelectionState;
type AppActions = FilterActions & SortActions & SelectionActions;

const initialState: AppState = {
  // Filters
  sharesRange: [0, 100000], // Example initial range
  year: undefined,
  advertiser: undefined,
  niche: undefined,
  searchTerm: undefined,
  // Sorting
  sortBy: 'createdAt', 
  sortOrder: 'desc',
  // Selection
  selectedAssetIds: new Set(),
};

export const useAppStore = create<AppState & AppActions>()(
  devtools(
    (set, _get) => ({
      ...initialState,

      // Filter Actions
      setYear: (year) => set({ year: year ? Number(year) : undefined }, false, 'setYear'), // Ensure number or undefined
      setAdvertiser: (advertiser) => set({ advertiser: advertiser || undefined }, false, 'setAdvertiser'),
      setNiche: (niche) => set({ niche: niche || undefined }, false, 'setNiche'),
      setSharesRange: (range) => set({ sharesRange: range }, false, 'setSharesRange'),
      setSearchTerm: (term) => set({ searchTerm: term || undefined }, false, 'setSearchTerm'),
      resetFilters: () => set({
        year: undefined,
        advertiser: undefined,
        niche: undefined,
        sharesRange: initialState.sharesRange,
        searchTerm: undefined,
       }, false, 'resetFilters'),

      // Sorting Actions
      setSortBy: (field) => set({ sortBy: field }, false, 'setSortBy'),
      setSortOrder: (order) => set({ sortOrder: order }, false, 'setSortOrder'),
      toggleSortOrder: () => set((state) => ({ sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc' }), false, 'toggleSortOrder'),

      // Selection Actions
      setSelected: (ids) => set({ selectedAssetIds: new Set(ids) }, false, 'setSelected'),
      addSelected: (id) => set((state) => ({ selectedAssetIds: new Set(state.selectedAssetIds).add(id) }), false, 'addSelected'),
      removeSelected: (id) => set((state) => {
        const newSet = new Set(state.selectedAssetIds);
        newSet.delete(id);
        return { selectedAssetIds: newSet };
      }, false, 'removeSelected'),
      toggleSelected: (id) => set((state) => {
        const newSet = new Set(state.selectedAssetIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedAssetIds: newSet };
      }, false, 'toggleSelected'),
      clearSelection: () => set({ selectedAssetIds: new Set() }, false, 'clearSelection'),
    }),
    { name: 'AppStore' }
  )
);

// --- Selector Hooks --- 

// Combined Filters Selector (includes sorting for get-assets)
export const useAssetQuery = () => useStoreWithEqualityFn(
    useAppStore,
    (state) => ({
      year: state.year,
      advertiser: state.advertiser,
      niche: state.niche,
      sharesRange: state.sharesRange,
      searchTerm: state.searchTerm,
      sortBy: state.sortBy,
      sortOrder: state.sortOrder,
    }),
    shallow
);

// Selection State Selector
export const useSelection = () => useAppStore((state) => state.selectedAssetIds);
export const useSelectionCount = () => useAppStore((state) => state.selectedAssetIds.size);

// Individual Filter/Sort Selectors (for connecting specific inputs)
export const useYearFilter = () => useAppStore((state) => state.year);
export const useAdvertiserFilter = () => useAppStore((state) => state.advertiser);
export const useNicheFilter = () => useAppStore((state) => state.niche);
export const useSharesRangeFilter = () => useAppStore((state) => state.sharesRange);
export const useSearchTermFilter = () => useAppStore((state) => state.searchTerm);
export const useSortBy = () => useAppStore((state) => state.sortBy);
export const useSortOrder = () => useAppStore((state) => state.sortOrder);

// Actions Selector (consider splitting if it gets too large)
export const useAppActions = () => useStoreWithEqualityFn(
    useAppStore,
    (state) => ({ 
      // Filters
      setYear: state.setYear,
      setAdvertiser: state.setAdvertiser,
      setNiche: state.setNiche,
      setSharesRange: state.setSharesRange,
      setSearchTerm: state.setSearchTerm,
      resetFilters: state.resetFilters,
      // Sorting
      setSortBy: state.setSortBy,
      setSortOrder: state.setSortOrder,
      toggleSortOrder: state.toggleSortOrder,
      // Selection
      setSelected: state.setSelected,
      addSelected: state.addSelected,
      removeSelected: state.removeSelected,
      toggleSelected: state.toggleSelected,
      clearSelection: state.clearSelection,
    }),
    shallow
);

// Remove old filter-only hooks if they exist (or keep if used elsewhere)
// export const useFilters = () => ... 
// export const useFilterActions = () => ... 