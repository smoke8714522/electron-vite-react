// test/organisms/LibraryView.test.tsx
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LibraryView from '../../src/pages/LibraryView';
import { Asset } from '../../src/types/api';

// --- Mocks ---

// Mock API hooks
const mockFetchAssets = vi.fn();
vi.mock('../../src/hooks/useApi', () => ({
  useGetAssets: () => ({
    call: mockFetchAssets,
    loading: false,
    error: null,
    data: [], // Start with empty data initially
  }),
  // Mock other hooks if LibraryView uses them directly (e.g., import hooks)
}));

// Mock Zustand store hooks
vi.mock('../../src/store/filterStore', () => ({
  useAssetQuery: () => ({ /* mock query object */ }),
  // Mock other store hooks if needed
}));

// Mock Child Components
vi.mock('../../src/components/organisms/FilterSidebar', () => ({
  default: () => <div data-testid="filter-sidebar">FilterSidebar</div>,
}));

vi.mock('../../src/components/organisms/LibraryToolbar', () => ({
  default: ({ view, onViewChange }: { view: string, onViewChange: (v: string) => void }) => (
    <div data-testid="library-toolbar">
      LibraryToolbar - View: {view}
      <button data-testid="toggle-to-list" onClick={() => onViewChange('list')}>List</button>
      <button data-testid="toggle-to-grid" onClick={() => onViewChange('grid')}>Grid</button>
    </div>
  ),
}));

vi.mock('../../src/components/organisms/AssetGrid', () => ({
  default: ({ assets }: { assets: Asset[] }) => <div data-testid="asset-grid">AssetGrid ({assets?.length || 0})</div>,
}));

vi.mock('../../src/components/organisms/AssetList', () => ({
  default: ({ assets }: { assets: Asset[] }) => <div data-testid="asset-list">AssetList ({assets?.length || 0})</div>,
}));

// Mock AutoSizer for child components if they aren't mocked away entirely
vi.mock('react-virtualized-auto-sizer', () => ({
    default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
      children({ height: 600, width: 800 }),
}));


// --- Tests ---

describe('LibraryView Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockFetchAssets.mockClear();
    // Mock fetchAssets to resolve immediately for useEffect
    mockFetchAssets.mockResolvedValue({ success: true, data: [] });
  });

  afterEach(cleanup);

  it('renders FilterSidebar and LibraryToolbar', () => {
    render(<LibraryView />);
    expect(screen.getByTestId('filter-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('library-toolbar')).toBeInTheDocument();
  });

  it('fetches assets on initial mount', () => {
    render(<LibraryView />);
    expect(mockFetchAssets).toHaveBeenCalledTimes(1);
    // Optionally check the query passed if useAssetQuery is complex
    // expect(mockFetchAssets).toHaveBeenCalledWith(expect.any(Object));
  });

  it('renders AssetGrid by default', () => {
    render(<LibraryView />);
    expect(screen.getByTestId('asset-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-toolbar')).toHaveTextContent('View: grid');
  });

  it('switches to AssetList when view is changed via toolbar', () => {
    render(<LibraryView />);
    const listButton = screen.getByTestId('toggle-to-list');

    fireEvent.click(listButton);

    // Check if AssetList is now rendered and Grid is not
    expect(screen.getByTestId('asset-list')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-grid')).not.toBeInTheDocument();
    // Check if toolbar received the updated view prop
    expect(screen.getByTestId('library-toolbar')).toHaveTextContent('View: list');
  });

  it('switches back to AssetGrid when view is changed again', () => {
    render(<LibraryView />);
    const listButton = screen.getByTestId('toggle-to-list');
    const gridButton = screen.getByTestId('toggle-to-grid');

    // Go to list view first
    fireEvent.click(listButton);
    expect(screen.getByTestId('asset-list')).toBeInTheDocument();
    expect(screen.getByTestId('library-toolbar')).toHaveTextContent('View: list');

    // Go back to grid view
    fireEvent.click(gridButton);
    expect(screen.getByTestId('asset-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('asset-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('library-toolbar')).toHaveTextContent('View: grid');
  });

  // TODO: Test what happens when asset data updates (passed down correctly)
  // TODO: Test loading and error states passed down to Grid/List
}); 