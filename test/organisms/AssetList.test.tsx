// test/organisms/AssetList.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import AssetList from '../../src/components/organisms/AssetList';
import { Asset } from '../../src/types/api';

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: { children: (size: { height: number; width: number }) => React.ReactNode }) =>
    children({ height: 600, width: 800 }), // Provide fixed dimensions
}));

// Mock AssetCard (can be the same mock as AssetGrid, or a simpler one for list view)
vi.mock('../../src/components/molecules/AssetCard', () => ({
  // Assuming AssetCard is reused directly in the list rows
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
  { id: 1, path: 'files/doc1.pdf', fileName: 'doc1.pdf', createdAt: '2023-01-01', mimeType: 'application/pdf', size: 1024, master_id: null, version_no: 1, shares: 5 },
  { id: 2, path: 'audio/track2.mp3', fileName: 'track2.mp3', createdAt: '2023-01-02', mimeType: 'audio/mpeg', size: 2048, master_id: null, version_no: 1, shares: 120 },
  { id: 3, path: 'images/pic3.gif', fileName: 'pic3.gif', createdAt: '2023-01-03', mimeType: 'image/gif', size: 4096, master_id: null, version_no: 1, shares: 0 },
];

describe('AssetList Component', () => {
  it('renders loading state correctly', () => {
    // Need access to the container to query by class
    const { container } = render(<AssetList assets={undefined} loading={true} error={null} />);
    // Check for skeleton elements by class
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
    // Check if mocked list items (via AssetCard mock) are rendered
    // Virtualization means only visible items are rendered.
    expect(screen.getByTestId('asset-card-1')).toBeInTheDocument();
    expect(screen.getByText('files/doc1.pdf')).toBeInTheDocument();
    expect(screen.getByTestId('asset-card-2')).toBeInTheDocument();
    expect(screen.getByText('audio/track2.mp3')).toBeInTheDocument();
    // Add more checks based on the mocked height/width
  });

  // TODO: Add tests for selection interactions (click, ctrl+click) specific to list rows
}); 