import { render, screen, fireEvent } from '@testing-library/react';
import { PostConfirmDialog } from './PostConfirmDialog';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('PostConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    title: 'Test Title',
    description: 'Test Description',
    warningText: 'Test Warning',
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.dir = 'rtl'; // Default to RTL
  });

  it('renders correctly when open', () => {
    render(<PostConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Warning')).toBeInTheDocument();
  });

  it('requires text confirmation in RTL mode', () => {
    render(<PostConfirmDialog {...defaultProps} requiresTextConfirmation={true} />);
    
    const input = screen.getByRole('textbox');
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });

    expect(confirmBtn).toBeDisabled();

    // Type wrong word
    fireEvent.change(input, { target: { value: 'CONFIRM' } });
    expect(confirmBtn).toBeDisabled();

    // Type correct word
    fireEvent.change(input, { target: { value: 'تأكيد' } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('requires text confirmation in LTR mode', () => {
    document.documentElement.dir = 'ltr';
    render(<PostConfirmDialog {...defaultProps} requiresTextConfirmation={true} />);
    
    const input = screen.getByRole('textbox');
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });

    // Type RTL word in LTR mode
    fireEvent.change(input, { target: { value: 'تأكيد' } });
    expect(confirmBtn).toBeDisabled();

    // Type correct LTR word
    fireEvent.change(input, { target: { value: 'CONFIRM' } });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('disables interaction when loading', () => {
    render(<PostConfirmDialog {...defaultProps} isLoading={true} />);
    
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
    expect(screen.queryByText('✕')).not.toBeInTheDocument(); // Close button hidden
    expect(screen.queryByText(/cancel/i)).not.toBeInTheDocument(); // Cancel button hidden
  });

  it('closes on Escape key when not loading', () => {
    render(<PostConfirmDialog {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does NOT close on Escape key when loading', () => {
    render(<PostConfirmDialog {...defaultProps} isLoading={true} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onOpenChange).not.toHaveBeenCalled();
  });

  it('calls onOpenChange(false) when clicking close or cancel', () => {
    render(<PostConfirmDialog {...defaultProps} />);
    
    fireEvent.click(screen.getByText('✕'));
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByText(/cancel/i));
    expect(defaultProps.onOpenChange).toHaveBeenCalledTimes(2);
  });
  it('does NOT render when open is false', () => {
    const { container } = render(<PostConfirmDialog {...defaultProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders children when provided', () => {
    render(
      <PostConfirmDialog {...defaultProps}>
        <div data-testid="custom-child">Custom Content</div>
      </PostConfirmDialog>
    );
    expect(screen.getByTestId('custom-child')).toBeInTheDocument();
  });

  it('does NOT require text confirmation when flag is false', () => {
    render(<PostConfirmDialog {...defaultProps} requiresTextConfirmation={false} />);
    const confirmBtn = screen.getByRole('button', { name: /confirm/i });
    expect(confirmBtn).not.toBeDisabled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
