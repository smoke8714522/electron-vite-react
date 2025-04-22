// test/organisms/AssetList.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssetList from '../../src/components/organisms/AssetList';
import { Asset } from '../../src/types/api';

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 600, width: 800 }), // Provide fixed dimensions
}));

// Mock AssetCard - same as AssetGrid mock
const mockOnClickAssetCard = vi.fn();
vi.mock('../../src/components/molecules/AssetCard', () => ({
  default: ({ asset, isSelected, onClick }: { asset: Asset, isSelected: boolean, onClick: (e: React.MouseEvent) => void }) => (
    <div 
      data-testid={`asset-card-${asset.id}`} 
      onClick={(e) => {
        mockOnClickAssetCard(asset.id, e); // Mock the call locally if needed
        onClick(e); // Propagate the click event up to AssetList
      }}
      aria-selected={isSelected}
      role="listitem" // Add role for better semantics in list context
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
  { id: 1, path: 'files/doc1.pdf', fileName: 'doc1.pdf', createdAt: '2023-01-01', mimeType: 'application/pdf', size: 1024, master_id: null, version_no: 1, shares: 5 },
  { id: 2, path: 'audio/track2.mp3', fileName: 'track2.mp3', createdAt: '2023-01-02', mimeType: 'audio/mpeg', size: 2048, master_id: null, version_no: 1, shares: 120 },
  { id: 3, path: 'images/pic3.gif', fileName: 'pic3.gif', createdAt: '2023-01-03', mimeType: 'image/gif', size: 4096, master_id: null, version_no: 1, shares: 0 },
];

describe('AssetList Component', () => {

  beforeEach(() => {
    // Clear mocks before each test
    mockSetSelected.mockClear();
    mockToggleSelected.mockClear();
    mockOnClickAssetCard.mockClear();
  });

  // --- Rendering Tests ---
  it('renders loading state correctly', () => {
    const { container } = render(<AssetList assets={undefined} loading={true} error={null} />);
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders error state correctly', () => {
    render(<AssetList assets={null} loading={false} error="Fetch failed" />);
    expect(screen.getByText(/Error fetching assets: Fetch failed/i)).toBeInTheDocument();
  });

  it('renders empty state correctly', () => {
    render(<AssetList assets={[]} loading={false} error={null} />);
    expect(screen.getByText(/No assets found/i)).toBeInTheDocument();
  });

  it('renders assets in a virtualized list', () => {
    render(<AssetList assets={mockAssets} loading={false} error={null} />);
    expect(screen.getByTestId('asset-card-1')).toBeInTheDocument();
    expect(screen.getByText('files/doc1.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('asset-card-2')).toBeInTheDocument();
    expect(screen.getByText('audio/track2.mp3')).toBeInTheDocument();
  });

  // --- Selection Tests ---
  describe('Selection Handling', () => {
    it('calls setSelected action on single click', () => {
      render(<AssetList assets={mockAssets} loading={false} error={null} />);
      // Find the mock list item representation
      const listItem1 = screen.getByTestId('asset-card-1');
      
      fireEvent.click(listItem1);

      expect(mockSetSelected).toHaveBeenCalledTimes(1);
      expect(mockSetSelected).toHaveBeenCalledWith([1]);
      expect(mockToggleSelected).not.toHaveBeenCalled();
    });

    it('calls toggleSelected action on Ctrl+click', () => {
      render(<AssetList assets={mockAssets} loading={false} error={null} />);
      const listItem2 = screen.getByTestId('asset-card-2');
      
      fireEvent.click(listItem2, { ctrlKey: true });

      expect(mockToggleSelected).toHaveBeenCalledTimes(1);
      expect(mockToggleSelected).toHaveBeenCalledWith(2);
      expect(mockSetSelected).not.toHaveBeenCalled();
    });
    
    it.skip('handles Shift+click for range selection', () => {
        // TODO: Implement shift-click test if AssetList supports it directly
    });
  });
}); 