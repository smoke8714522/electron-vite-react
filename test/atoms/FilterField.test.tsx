import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterField from '../../src/components/atoms/FilterField';
import SearchIcon from '@mui/icons-material/Search';

describe('FilterField', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('renders correctly with text type', () => {
    render(
      <FilterField
        icon={<SearchIcon data-testid="field-icon" />}
        label="Test Label"
        value="test value"
        onChange={mockOnChange}
        type="text"
      />
    );

    expect(screen.getByTestId('field-icon')).toBeInTheDocument();
    expect(screen.getByText('Test Label')).toBeInTheDocument();
    // Use getByRole to find the TextField input element
    const input = screen.getByRole('textbox', { name: /test label/i });
    expect(input).toHaveValue('test value');
    expect(input).toHaveAttribute('type', 'text');
  });

  test('renders correctly with number type', () => {
    render(
      <FilterField
        icon={<SearchIcon />}
        label="Number Label"
        value={123}
        onChange={mockOnChange}
        type="number"
      />
    );
    // Use getByRole to find the TextField input element
    const input = screen.getByRole('spinbutton', { name: /number label/i });
    expect(input).toHaveValue(123);
    expect(input).toHaveAttribute('type', 'number');
  });

  test('calls onChange with string value when text type input changes', () => {
    render(
      <FilterField
        icon={<SearchIcon />}
        label="Text Input"
        value=""
        onChange={mockOnChange}
        type="text"
      />
    );
    // Use getByRole to find the TextField input element
    const input = screen.getByRole('textbox', { name: /text input/i });
    fireEvent.change(input, { target: { value: 'new text' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('new text');
  });

  test('calls onChange with number value when number type input changes', () => {
    render(
      <FilterField
        icon={<SearchIcon />}
        label="Number Input"
        value={0}
        onChange={mockOnChange}
        type="number"
      />
    );
    // Use getByRole to find the TextField input element
    const input = screen.getByRole('spinbutton', { name: /number input/i });
    fireEvent.change(input, { target: { value: '456' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(456);
  });

  test('calls onChange with 0 when number type input is invalid', () => {
    render(
      <FilterField
        icon={<SearchIcon />}
        label="Invalid Number Input"
        value={0}
        onChange={mockOnChange}
        type="number"
      />
    );
    // Use getByRole to find the TextField input element
    const input = screen.getByRole('spinbutton', { name: /invalid number input/i });
    fireEvent.change(input, { target: { value: 'abc' } });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(0); // parseInt returns NaN, falls back to 0
  });
}); 