import { create } from 'zustand';

// Define the interface for the store's state
interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

// Create the Zustand store
export const useAppStore = create<AppState>((set) => ({
  darkMode: false, // Initial state
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })), // Action to toggle dark mode
})); 