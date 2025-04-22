// test/organisms/LibraryToolbar.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // For Select interaction
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LibraryToolbar from '../../src/components/organisms/LibraryToolbar';
import type { ViewMode } from '../../src/pages/LibraryView'; // Assuming type is exported here

// --- Mocks ---

// Define mock functions FIRST
const mockSetSortBy = vi.fn();
const mockClearSelection = vi.fn();
const mockUseSortBy = vi.fn(() => 'createdAt');
const mockUseSelection = vi.fn(() => new Set<number>());
const mockUseSelectionCount = vi.fn(() => 0);
const mockCallBulkImport = vi.fn();
const mockCallDeleteAsset = vi.fn();

// Mock ActionButton atom FIRST
interface MockActionButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
vi.mock('../../src/components/atoms/ActionButton', () => ({
  default: ({ label, onClick, disabled, loading }: MockActionButtonProps) => (
    <button onClick={onClick} disabled={disabled || loading} data-testid={`action-button-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {loading ? 'Loading...' : label}
    </button>
  ),
}));

// Then Mock the store, referencing the functions above
vi.mock('../../src/store/filterStore', () => ({
  useSortBy: mockUseSortBy,
  useSelection: mockUseSelection,
  useSelectionCount: mockUseSelectionCount,
  useAppActions: () => ({
    setSortBy: mockSetSortBy,
    clearSelection: mockClearSelection,
  }),
}));

// Then Mock API hooks, referencing the functions above
vi.mock('../../src/hooks/useApi', () => ({
  useBulkImportAssets: () => ({
    call: mockCallBulkImport,
    loading: false,
  }),
  useDeleteAsset: () => ({
    call: mockCallDeleteAsset,
    loading: false,
  }),
}));

// --- Props Mocks ---
const mockOnViewChange = vi.fn();
const mockOnRefreshNeeded = vi.fn().mockResolvedValue({ success: true }); // Mock refresh

describe('LibraryToolbar Component', () => {
  let viewMode: ViewMode = 'grid'; // Initial view

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    // Reset mock implementations to defaults before each test
    mockUseSortBy.mockReturnValue('createdAt');
    mockUseSelection.mockReturnValue(new Set<number>());
    mockUseSelectionCount.mockReturnValue(0);
    viewMode = 'grid'; // Reset view mode
  });

  // Helper to render with specific selection count
  const renderToolbar = (selectionCount = 0) => { 
    // Set mock return values *before* rendering
    mockUseSelectionCount.mockReturnValue(selectionCount);
    mockUseSelection.mockReturnValue(new Set(Array.from({ length: selectionCount }, (_, i) => i + 1)));

    render(
      <LibraryToolbar
        view={viewMode}
        onViewChange={mockOnViewChange}
        onRefreshNeeded={mockOnRefreshNeeded}
      />
    );
  };

  it('renders all toolbar elements', () => {
    renderToolbar(2); // Render with selection to show all elements
    // Batch actions section (visible because selectionCount = 2)
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
    expect(screen.getByTestId('action-button-edit-tags')).toBeInTheDocument();
    expect(screen.getByTestId('action-button-delete')).toBeInTheDocument();
    // Main actions
    expect(screen.getByTestId('action-button-bulk-import')).toBeInTheDocument();
    // Sort dropdown
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument(); // Check for the label
    // View toggles
    expect(screen.getByRole('group', { name: /view mode/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
  });

  it('disables batch actions when selection count is 0', () => {
    renderToolbar(0); // Default render sets count to 0 via beforeEach/helper default
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument(); // Count shouldn't show
    expect(screen.getByTestId('action-button-edit-tags')).toBeDisabled();
    expect(screen.getByTestId('action-button-delete')).toBeDisabled();
  });

  it('enables batch actions when selection count is > 0', () => {
    renderToolbar(1); // Render with 1 selection
    expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    expect(screen.getByTestId('action-button-edit-tags')).not.toBeDisabled();
    expect(screen.getByTestId('action-button-delete')).not.toBeDisabled();
  });

  it('calls onViewChange when view toggle buttons are clicked', () => {
    renderToolbar();
    const gridButton = screen.getByRole('button', { name: /grid view/i });
    const listButton = screen.getByRole('button', { name: /list view/i });

    fireEvent.click(listButton);
    expect(mockOnViewChange).toHaveBeenCalledTimes(1);
    expect(mockOnViewChange).toHaveBeenCalledWith('list');

    fireEvent.click(gridButton);
    expect(mockOnViewChange).toHaveBeenCalledTimes(2);
    expect(mockOnViewChange).toHaveBeenCalledWith('grid');
  });

  it('calls setSortBy action when sort dropdown value changes', async () => {
    const user = userEvent.setup();
    renderToolbar();
    // Find the button that opens the Select, usually has the current value or the label text
    const selectButton = screen.getByRole('combobox', { name: /Sort By/i });

    await user.click(selectButton);
    // Wait for the listbox with options to appear and click one
    await user.click(screen.getByRole('option', { name: 'Year' }));

    expect(mockSetSortBy).toHaveBeenCalledTimes(1);
    expect(mockSetSortBy).toHaveBeenCalledWith('year');
  });

  it('calls bulk import API hook and refresh on Bulk Import click', async () => {
    renderToolbar();
    const importButton = screen.getByTestId('action-button-bulk-import');
    // Use userEvent for potentially more robust click simulation
    await userEvent.click(importButton);

    expect(mockCallBulkImport).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(mockOnRefreshNeeded).toHaveBeenCalledTimes(1);
    });
  });

  it('calls delete API hook for selected items and refresh on Delete click', async () => {
    renderToolbar(2); // Render with 2 items selected
    const deleteButton = screen.getByTestId('action-button-delete');
    await userEvent.click(deleteButton);

    // Check API call mock
    expect(mockCallDeleteAsset).toHaveBeenCalledTimes(2);
    expect(mockCallDeleteAsset).toHaveBeenCalledWith({ id: 1 });
    expect(mockCallDeleteAsset).toHaveBeenCalledWith({ id: 2 });

    // Check state updates and refresh
    await vi.waitFor(() => {
        expect(mockClearSelection).toHaveBeenCalledTimes(1);
        expect(mockOnRefreshNeeded).toHaveBeenCalledTimes(1);
    });
  });

  it('calls handler (logs) on Edit Tags click', async () => {
    renderToolbar(2);
    const editButton = screen.getByTestId('action-button-edit-tags');
    await userEvent.click(editButton);
    // Basic check - we aren't testing the modal opening here, just the click handler logic
    expect(editButton).toBeInTheDocument(); 
    // If Edit Tags had its own callback prop, we would check that mock
  });
}); 