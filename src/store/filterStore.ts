import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { useStoreWithEqualityFn } from 'zustand/traditional';

interface FilterState {
  year?: number;
  advertiser?: string;
  niche?: string;
  sharesRange: [number, number]; // [min, max]
  searchTerm?: string; // Added based on sidebar spec in appflow
}

interface FilterActions {
  setYear: (year?: number) => void;
  setAdvertiser: (advertiser?: string) => void;
  setNiche: (niche?: string) => void;
  setSharesRange: (range: [number, number]) => void;
  setSearchTerm: (term?: string) => void;
  resetFilters: () => void;
}

const initialState: FilterState = {
  sharesRange: [0, 100000], // Example initial range
  // Other filters default to undefined
};

export const useFilterStore = create<FilterState & FilterActions>()(
  devtools(
    (set) => ({
      ...initialState,
      setYear: (year) => set({ year }, false, 'setYear'),
      setAdvertiser: (advertiser) => set({ advertiser: advertiser || undefined }, false, 'setAdvertiser'),
      setNiche: (niche) => set({ niche: niche || undefined }, false, 'setNiche'),
      setSharesRange: (range) => set({ sharesRange: range }, false, 'setSharesRange'),
      setSearchTerm: (term) => set({ searchTerm: term || undefined }, false, 'setSearchTerm'),
      resetFilters: () => set(initialState, false, 'resetFilters'),
    }),
    { name: 'FilterStore' }
  )
);

// Selector hook using useStoreWithEqualityFn for shallow comparison
export const useFilters = () => useStoreWithEqualityFn(
    useFilterStore, // Pass the store hook itself
    (state) => ({   // The selector function
      year: state.year,
      advertiser: state.advertiser,
      niche: state.niche,
      sharesRange: state.sharesRange,
      searchTerm: state.searchTerm,
    }), 
    shallow // The equality function
);

export const useFilterActions = () => useFilterStore((state) => ({
  setYear: state.setYear,
  setAdvertiser: state.setAdvertiser,
  setNiche: state.setNiche,
  setSharesRange: state.setSharesRange,
  setSearchTerm: state.setSearchTerm,
  resetFilters: state.resetFilters,
})); 