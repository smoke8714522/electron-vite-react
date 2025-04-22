// test/organisms/AssetGrid.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssetGrid from '../../src/components/organisms/AssetGrid';
import { Asset } from '../../src/types/api';

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 600, width: 800 }), // Provide fixed dimensions for testing
}));

// Mock AssetCard to include onClick prop simulation
const mockOnClickAssetCard = vi.fn();
vi.mock('../../src/components/molecules/AssetCard', () => ({
  // Let the grid pass down the isSelected prop and onClick handler
  default: ({ asset, isSelected, onClick }: { asset: Asset, isSelected: boolean, onClick: (e: React.MouseEvent) => void }) => (
    <div 
      data-testid={`asset-card-${asset.id}`} 
      onClick={(e) => {
        mockOnClickAssetCard(asset.id, e); // Mock the call locally if needed
        onClick(e); // Propagate the click event up to AssetGrid
      }}
      aria-selected={isSelected}
    >
      {asset.path}
    </div>
  ),
}));

// Mock Zustand store hooks - Provide selection actions
const mockSetSelected = vi.fn();
const mockToggleSelected = vi.fn();
vi.mock('../../src/store/filterStore', () => ({
  useSelection: () => new Set<number>(), // Start with empty selection
  useAppActions: () => ({
    setSelected: mockSetSelected,
    toggleSelected: mockToggleSelected,
  }),
}));

const mockAssets: Asset[] = [
  { id: 1, path: 'img/1.jpg', fileName: '1.jpg', createdAt: '2023-01-01', mimeType: 'image/jpeg', size: 1024, master_id: null, version_no: 1, shares: 10 },
  { id: 2, path: 'img/2.png', fileName: '2.png', createdAt: '2023-01-02', mimeType: 'image/png', size: 2048, master_id: null, version_no: 1, shares: 0 },
  { id: 3, path: 'video/3.mp4', fileName: '3.mp4', createdAt: '2023-01-03', mimeType: 'video/mp4', size: 4096, master_id: null, version_no: 1, shares: 55 },
];

describe('AssetGrid Component', () => {

  beforeEach(() => {
    // Clear mocks before each test
    mockSetSelected.mockClear();
    mockToggleSelected.mockClear();
    mockOnClickAssetCard.mockClear();
    // Reset the selection mock if necessary (e.g., if testing selection state changes)
    // vi.mocked(require('../../src/store/filterStore').useSelection).mockReturnValue(new Set());
  });

  it('renders loading state correctly', () => {
    // Need access to the container to query by class
    const { container } = render(<AssetGrid assets={undefined} loading={true} error={null} />);
    // Check for skeleton elements by class
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state correctly', () => {
    render(<AssetGrid assets={null} loading={false} error="Failed to fetch" />);
    expect(screen.getByText(/Error fetching assets: Failed to fetch/i)).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(<AssetGrid assets={[]} loading={false} error={null} />);
    expect(screen.getByText(/No assets found/i)).toBeInTheDocument();
  });

  it('renders assets in a virtualized grid', () => {
    render(<AssetGrid assets={mockAssets} loading={false} error={null} />);
    // Check if AssetCard mocks are rendered for the visible items
    // Due to virtualization, not all assets might be in the DOM immediately.
    // Test for the presence of at least the first few assets.
    expect(screen.getByTestId('asset-card-1')).toBeInTheDocument();
    expect(screen.getByText('img/1.jpg')).toBeInTheDocument();
    expect(screen.getByTestId('asset-card-2')).toBeInTheDocument();
    expect(screen.getByText('img/2.png')).toBeInTheDocument();
    // Add more checks if needed, depending on the fixed size used in mock
  });

  // --- Selection Tests ---
  describe('Selection Handling', () => {
    it('calls setSelected action on single click', () => {
      render(<AssetGrid assets={mockAssets} loading={false} error={null} />);
      const card1 = screen.getByTestId('asset-card-1');
      
      fireEvent.click(card1);

      expect(mockSetSelected).toHaveBeenCalledTimes(1);
      expect(mockSetSelected).toHaveBeenCalledWith([1]); // Assuming single click replaces selection
      expect(mockToggleSelected).not.toHaveBeenCalled();
    });

    it('calls toggleSelected action on Ctrl+click', () => {
      render(<AssetGrid assets={mockAssets} loading={false} error={null} />);
      const card2 = screen.getByTestId('asset-card-2');
      
      // Simulate Ctrl key being pressed during the click
      fireEvent.click(card2, { ctrlKey: true });

      expect(mockToggleSelected).toHaveBeenCalledTimes(1);
      expect(mockToggleSelected).toHaveBeenCalledWith(2);
      expect(mockSetSelected).not.toHaveBeenCalled();
    });
    
    // Note: Shift+click requires more complex state tracking (last clicked item)
    // which might be better suited for E2E tests or if AssetGrid itself manages that state.
    it.skip('handles Shift+click for range selection', () => {
        // TODO: Implement shift-click test if AssetGrid supports it directly
    });
  });

  // --- Drag-and-Drop Tests (Placeholder) ---
  describe.skip('Drag and Drop Grouping', () => {
    // TODO: Add tests for drag-and-drop grouping if implemented in AssetCard/AssetGrid
    // This would likely involve mocking the drag events and the addToGroup API call
    it('initiates drag correctly', () => {
      // Render, find draggable element, simulate dragStart
      // Assert dataTransfer data is set correctly
    });

    it('handles drop correctly and calls API', () => {
      // Render, find drop target, simulate dragOver, simulate drop
      // Assert addToGroup API mock is called with correct source/target IDs
    });
  });
}); 