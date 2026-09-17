import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HierarchyTable } from './HierarchyTable';
import company from '../data/company.json';

describe('HierarchyTable', () => {
  it('expands and collapses nested rows with keyboard controls', async () => {
    const user = userEvent.setup();
    render(<HierarchyTable root={company} selectedId={company.id} onSelect={vi.fn()} />);
    const branch = screen.getByRole('button', { name: 'Expand Branch 1' });
    expect(screen.queryByRole('button', { name: /Anna Blackwood, employee/ })).not.toBeInTheDocument();
    branch.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /Anna Blackwood, employee/ })).toBeInTheDocument();
    const anna = screen.getByRole('button', { name: 'Expand Anna Blackwood' });
    anna.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: /Existing clients, channel/ })).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /Existing clients/ })).getAllByRole('cell')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: 'Collapse Branch 1' }));
    expect(screen.queryByRole('button', { name: /Anna Blackwood, employee/ })).not.toBeInTheDocument();
    branch.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Branch 2, branch/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('button', { name: /Branch 3, branch/ })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Collapse Company' })).toHaveFocus();
  });
});
