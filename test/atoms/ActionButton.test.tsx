import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionButton from '../../src/components/atoms/ActionButton';
import SaveIcon from '@mui/icons-material/Save';

describe('ActionButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('renders correctly with label and icon', () => {
    render(
      <ActionButton
        icon={<SaveIcon data-testid="action-icon" />}
        label="Save Action"
        onClick={mockOnClick}
      />
    );

    expect(screen.getByRole('button', { name: /save action/i })).toBeInTheDocument();
    expect(screen.getByTestId('action-icon')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  test('renders loading state correctly', () => {
    render(
      <ActionButton
        icon={<SaveIcon data-testid="action-icon" />}
        label="Saving..."
        loading={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled(); // Should be disabled when loading
    expect(screen.queryByTestId('action-icon')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders disabled state correctly', () => {
    render(
      <ActionButton
        icon={<SaveIcon />}
        label="Cannot Save"
        disabled={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /cannot save/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  test('calls onClick handler when clicked and not disabled/loading', () => {
    render(
      <ActionButton
        icon={<SaveIcon />}
        label="Click Me"
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick handler when disabled', () => {
    render(
      <ActionButton
        icon={<SaveIcon />}
        label="Disabled Button"
        disabled={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /disabled button/i });
    fireEvent.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
  });

    test('does not call onClick handler when loading', () => {
    render(
      <ActionButton
        icon={<SaveIcon />}
        label="Loading Button"
        loading={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button', { name: /loading button/i });
    // Note: Clicking a disabled button shouldn't fire the event anyway,
    // but this test explicitly checks the loading state interaction.
    fireEvent.click(button);

    expect(mockOnClick).not.toHaveBeenCalled();
  });
}); 