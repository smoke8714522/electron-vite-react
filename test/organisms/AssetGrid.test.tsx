// test/organisms/AssetGrid.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import AssetGrid from '../../src/components/organisms/AssetGrid';
import { Asset } from '../../src/types/api';

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 600, width: 800 }), // Provide fixed dimensions for testing
}));

// Mock AssetCard
vi.mock('../../src/components/molecules/AssetCard', () => ({
  default: ({ asset }: { asset: Asset }) => <div data-testid={`asset-card-${asset.id}`}>{asset.path}</div>,
}));

// Mock Zustand store hooks
vi.mock('../../src/store/filterStore', () => ({
  useSelection: () => new Set<number>(),
  useAppActions: () => ({
    toggleSelected: vi.fn(),
    setSelected: vi.fn(),
  }),
}));

const mockAssets: Asset[] = [
  { id: 1, path: 'img/1.jpg', fileName: '1.jpg', createdAt: '2023-01-01', mimeType: 'image/jpeg', size: 1024, master_id: null, version_no: 1, shares: 10 },
  { id: 2, path: 'img/2.png', fileName: '2.png', createdAt: '2023-01-02', mimeType: 'image/png', size: 2048, master_id: null, version_no: 1, shares: 0 },
  { id: 3, path: 'video/3.mp4', fileName: '3.mp4', createdAt: '2023-01-03', mimeType: 'video/mp4', size: 4096, master_id: null, version_no: 1, shares: 55 },
];

describe('AssetGrid Component', () => {
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

  // TODO: Add tests for selection interactions (click, ctrl+click)
  // TODO: Add tests for drag-and-drop grouping if implemented in AssetCard/AssetGrid
}); 