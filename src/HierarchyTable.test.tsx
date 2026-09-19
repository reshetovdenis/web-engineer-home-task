import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { HierarchyTable } from './HierarchyTable';
import rawCompany from '../data/company.json';
import { toBusinessNode } from './viewModel';
import { createReport } from '../server/report.ts';
import { fullReportRange, reportLabels } from './reportPeriod';

const defaultLabels = reportLabels(fullReportRange, 'month');
const company = toBusinessNode(rawCompany);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('HierarchyTable', () => {
  it('uses employee avatar URLs and falls back to initials when an image fails', async () => {
    const user = userEvent.setup();
    const { container } = render(<HierarchyTable root={company} labels={defaultLabels} selectedId={company.id} onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Expand Branch 1' }));

    const avatars = container.querySelectorAll('img.employee-avatar');
    expect(avatars).toHaveLength(5);
    for (const employee of company.branches[0].employees!) {
      expect(container.querySelector(`img[src="/api/avatars/${employee.id}.jpg"]`)).toBeInTheDocument();
    }

    const annaAvatar = container.querySelector(`img[src="/api/avatars/${company.branches[0].employees![0].id}.jpg"]`)!;
    expect(annaAvatar).toHaveAttribute('alt', '');
    expect(annaAvatar).toHaveAttribute('width', '20');
    expect(annaAvatar).toHaveAttribute('height', '20');

    fireEvent.error(annaAvatar);
    const fallback = container.querySelector('.employee-avatar-fallback');
    expect(fallback).toHaveTextContent('AB');
  });


  it('shows four months at a time at iPad mini portrait width', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('innerWidth', 768);
    render(<HierarchyTable root={company} labels={defaultLabels} selectedId={company.id} onSelect={vi.fn()} />);

    const month = screen.getByRole('combobox', { name: 'Months' });
    expect(month).toHaveValue('0');
    expect(document.querySelectorAll('thead .month-current')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: 'May 2024' })).toHaveClass('month-current');
    await user.selectOptions(month, '4');

    expect(screen.getByRole('columnheader', { name: 'Jun 2024' })).toHaveClass('month-current');
    expect(screen.queryByRole('columnheader', { name: 'Feb 2024' })).not.toBeInTheDocument();
    const companyRow = screen.getByRole('button', { name: /Company, company/ }).closest('tr')!;
    expect(companyRow.querySelectorAll('td.month-current')).toHaveLength(4);
    expect(companyRow.querySelector('td.month-current')).toHaveTextContent(String(company.values[4]));

    vi.stubGlobal('innerWidth', 1024);
    fireEvent.resize(window);
    expect(document.querySelectorAll('thead .month-current')).toHaveLength(7);
  });

  it('shows one month at 375px and keeps every month reachable', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('innerWidth', 375);
    render(<HierarchyTable root={company} labels={defaultLabels} selectedId={company.id} onSelect={vi.fn()} />);

    const month = screen.getByRole('combobox', { name: 'Months' });
    expect(document.querySelectorAll('thead .month-current')).toHaveLength(1);
    await user.selectOptions(month, '11');
    expect(screen.getByRole('columnheader', { name: 'Jan 2025' })).toHaveClass('month-current');
  });

  it('makes the last displayed day the last table column when a month has more dates', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('innerWidth', 1440);
    const report = toBusinessNode(createReport(rawCompany, '2024-02-01', '2024-02-29', 'day'));
    const labels = reportLabels({ from: new Date(2024, 1, 1), to: new Date(2024, 1, 29) }, 'day');
    const { container } = render(<HierarchyTable root={report} labels={labels} detail="day" selectedId={company.id} onSelect={vi.fn()} />);

    const headers = container.querySelectorAll('thead th');
    expect(headers).toHaveLength(13);
    expect(headers[12]).toHaveTextContent('Feb 12');
    expect(container.querySelectorAll('tbody tr:first-child td')).toHaveLength(12);
    expect(container.querySelector('tbody tr:first-child td:last-child')).toHaveTextContent(report.values[11].toLocaleString());

    await user.selectOptions(screen.getByRole('combobox', { name: 'Days' }), '17');
    expect(container.querySelectorAll('thead th')).toHaveLength(13);
    expect(container.querySelector('thead th:last-child')).toHaveTextContent('Feb 29');
    expect(container.querySelector('tbody tr:first-child td:last-child')).toHaveTextContent(report.values[28].toLocaleString());
  });

  it('expands and collapses nested rows with keyboard controls', async () => {
    const user = userEvent.setup();

    render(
      <HierarchyTable
        root={company}
        labels={defaultLabels}
        selectedId={company.id}
        onSelect={vi.fn()}
      />,
    );

    const branch = screen.getByRole('button', {
      name: 'Expand Branch 1',
    });

    expect(
      screen.queryByRole('button', {
        name: /Anna Blackwood, employee/,
      }),
    ).not.toBeInTheDocument();

    branch.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', {
        name: /Anna Blackwood, employee/,
      }),
    ).toBeInTheDocument();

    const anna = screen.getByRole('button', {
      name: 'Expand Anna Blackwood',
    });

    anna.focus();
    await user.keyboard(' ');

    expect(
      screen.getByRole('button', {
        name: /Existing clients, channel/,
      }),
    ).toBeInTheDocument();

    expect(
      within(
        screen.getByRole('row', {
          name: /Existing clients/,
        }),
      ).getAllByRole('cell'),
    ).toHaveLength(document.querySelectorAll('thead th.month-current').length);

    await user.click(
      screen.getByRole('button', {
        name: 'Collapse Branch 1',
      }),
    );

    expect(
      screen.queryByRole('button', {
        name: /Anna Blackwood, employee/,
      }),
    ).not.toBeInTheDocument();

    branch.focus();
    await user.keyboard('{ArrowDown}');

    expect(
      screen.getByRole('button', {
        name: /Branch 2, branch/,
      }),
    ).toHaveFocus();

    await user.keyboard('{ArrowDown}');

    expect(
      screen.getByRole('button', {
        name: /Branch 3, branch/,
      }),
    ).toHaveFocus();

    await user.keyboard('{ArrowLeft}');

    expect(
      screen.getByRole('button', {
        name: 'Collapse Company',
      }),
    ).toHaveFocus();
  });


  it('windows large visible row sets instead of mounting every row', () => {
    const largeCompany = toBusinessNode({
      ...rawCompany,
      branches: Array.from({ length: 500 }, (_, index) => ({
        id: `branch-${index + 1}`,
        name: `Large Branch ${index + 1}`,
        values: rawCompany.values,
      })),
    });
    const { container } = render(<HierarchyTable root={largeCompany} labels={defaultLabels} selectedId={largeCompany.id} onSelect={vi.fn()} />);

    const treegrid = screen.getByRole('treegrid', { name: 'Client breakdown by month' });
    expect(treegrid).toHaveAttribute('aria-rowcount', '502');
    expect(container.querySelectorAll('tbody tr[data-row-index]')).toHaveLength(20);
    expect(screen.queryByRole('button', { name: /Large Branch 300, branch/ })).not.toBeInTheDocument();

    const scrollContainer = screen.getByLabelText('Client breakdown table');
    scrollContainer.scrollTop = 300 * 55;
    fireEvent.scroll(scrollContainer);

    expect(screen.getByRole('button', { name: /Large Branch 300, branch/ })).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr[data-row-index]').length).toBeLessThan(30);
  });


  it('requests the next child page only when the virtual window approaches the loaded tail', async () => {
    const user = userEvent.setup();
    const values = rawCompany.values;
    const pagedCompany = toBusinessNode({
      id: 'paged-company',
      name: 'Paged Company',
      values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'paged-branch',
        name: 'Paged Branch',
        values,
        hasChildren: true,
        childCount: 120,
        childrenLoaded: false,
        employees: Array.from({ length: 50 }, (_, index) => ({
          id: `paged-employee-${index + 1}`,
          name: `Paged Employee ${index + 1}`,
          values,
          hasChildren: false,
          childCount: 0,
          childrenLoaded: true,
        })),
      }],
    });
    const onLoadChildren = vi.fn().mockResolvedValue(undefined);

    render(<HierarchyTable
      root={pagedCompany}
      labels={defaultLabels}
      selectedId={pagedCompany.id}
      onSelect={vi.fn()}
      onLoadChildren={onLoadChildren}
    />);

    await user.click(screen.getByRole('button', { name: 'Expand Paged Branch' }));
    expect(onLoadChildren).not.toHaveBeenCalled();
    expect(screen.getByRole('treegrid', { name: 'Client breakdown by month' })).toHaveAttribute('aria-rowcount', '123');

    const firstEmployee = screen.getByRole('button', { name: /Paged Employee 1, employee/ }).closest('tr');
    expect(firstEmployee).toHaveAttribute('aria-setsize', '120');

    const scrollContainer = screen.getByLabelText('Client breakdown table');
    scrollContainer.scrollTop = 45 * 55;
    fireEvent.scroll(scrollContainer);

    expect(onLoadChildren).toHaveBeenCalledTimes(1);
    const requestedBranch = onLoadChildren.mock.calls[0][0];
    expect(requestedBranch.id).toBe('paged-branch');
    expect(requestedBranch.employees).toHaveLength(50);
    expect(requestedBranch.childrenLoaded).toBe(false);
  });


  it('shows a child-load error and retries the same node on the next expansion', async () => {
    const user = userEvent.setup();
    const lazyCompany = toBusinessNode({
      id: 'lazy-company',
      name: 'Lazy Company',
      values: rawCompany.values,
      childCount: 1,
      childrenLoaded: true,
      branches: [{
        id: 'lazy-branch',
        name: 'Lazy Branch',
        values: rawCompany.values,
        hasChildren: true,
        childCount: 2,
        childrenLoaded: false,
      }],
    });
    const onLoadChildren = vi.fn()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    render(<HierarchyTable
      root={lazyCompany}
      labels={defaultLabels}
      selectedId={lazyCompany.id}
      onSelect={vi.fn()}
      onLoadChildren={onLoadChildren}
    />);

    await user.click(screen.getByRole('button', { name: 'Expand Lazy Branch' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load children for Lazy Branch');
    expect(screen.getByRole('button', { name: 'Expand Lazy Branch' })).toHaveAttribute(
      'title',
      'Could not load Lazy Branch. Activate to retry.',
    );

    await user.click(screen.getByRole('button', { name: 'Expand Lazy Branch' }));
    await waitFor(() => expect(onLoadChildren).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('moves keyboard focus to an off-screen row in a virtualized hierarchy', async () => {
    const largeCompany = toBusinessNode({
      ...rawCompany,
      branches: Array.from({ length: 500 }, (_, index) => ({
        id: `keyboard-branch-${index + 1}`,
        name: `Keyboard Branch ${index + 1}`,
        values: rawCompany.values,
      })),
    });

    render(<HierarchyTable root={largeCompany} labels={defaultLabels} selectedId={largeCompany.id} onSelect={vi.fn()} />);
    const first = screen.getByRole('button', { name: /Keyboard Branch 1, branch/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'End' });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Keyboard Branch 500, branch/ })).toHaveFocus();
    });
  });

  it('exposes hierarchy depth, sibling position, size, and expansion state to assistive technology', async () => {
    const user = userEvent.setup();

    render(
      <HierarchyTable
        root={company}
        labels={defaultLabels}
        selectedId={company.id}
        onSelect={vi.fn()}
      />,
    );

    const treegrid = screen.getByRole('treegrid', {
      name: 'Client breakdown by month',
    });

    expect(treegrid).toBeInTheDocument();

    const companyButton = screen.getByRole('button', {
      name: 'Company, company, level 1; show in chart',
    });

    const companyRow = companyButton.closest('tr');

    expect(companyRow).not.toBeNull();
    expect(companyRow).toHaveAttribute('aria-level', '1');
    expect(companyRow).toHaveAttribute('aria-posinset', '1');
    expect(companyRow).toHaveAttribute('aria-setsize', '1');
    expect(companyRow).toHaveAttribute('aria-expanded', 'true');

    const branch1Button = screen.getByRole('button', {
      name: 'Branch 1, branch, level 2, child row; show in chart',
    });

    const branch1Row = branch1Button.closest('tr');

    expect(branch1Row).not.toBeNull();
    expect(branch1Row).toHaveAttribute('aria-level', '2');
    expect(branch1Row).toHaveAttribute('aria-posinset', '1');
    expect(branch1Row).toHaveAttribute('aria-setsize', '3');
    expect(branch1Row).toHaveAttribute('aria-expanded', 'false');

    const branch2Button = screen.getByRole('button', {
      name: 'Branch 2, branch, level 2, child row; show in chart',
    });

    const branch2Row = branch2Button.closest('tr');

    expect(branch2Row).not.toBeNull();
    expect(branch2Row).toHaveAttribute('aria-level', '2');
    expect(branch2Row).toHaveAttribute('aria-posinset', '2');
    expect(branch2Row).toHaveAttribute('aria-setsize', '3');
    expect(branch2Row).not.toHaveAttribute('aria-expanded');
    expect(branch2Button.previousElementSibling).toBeEmptyDOMElement();

    const branch3Button = screen.getByRole('button', {
      name: 'Branch 3, branch, level 2, child row; show in chart',
    });

    const branch3Row = branch3Button.closest('tr');

    expect(branch3Row).not.toBeNull();
    expect(branch3Row).toHaveAttribute('aria-level', '2');
    expect(branch3Row).toHaveAttribute('aria-posinset', '3');
    expect(branch3Row).toHaveAttribute('aria-setsize', '3');
    expect(branch3Row).not.toHaveAttribute('aria-expanded');
    expect(branch3Button.previousElementSibling).toBeEmptyDOMElement();

    await user.click(
      screen.getByRole('button', {
        name: 'Expand Branch 1',
      }),
    );

    expect(branch1Row).toHaveAttribute('aria-expanded', 'true');

    const annaButton = screen.getByRole('button', {
      name: 'Anna Blackwood, employee, level 3, child row; show in chart',
    });

    const annaRow = annaButton.closest('tr');

    expect(annaRow).not.toBeNull();
    expect(annaRow).toHaveAttribute('aria-level', '3');
    expect(annaRow).toHaveAttribute('aria-posinset', '1');
    expect(annaRow).toHaveAttribute('aria-setsize', '5');
    expect(annaRow).toHaveAttribute('aria-expanded', 'false');

    await user.click(
      screen.getByRole('button', {
        name: 'Expand Anna Blackwood',
      }),
    );

    expect(annaRow).toHaveAttribute('aria-expanded', 'true');

    const existingClientsButton = screen.getByRole('button', {
      name: /Existing clients, channel, level 4/,
    });

    const existingClientsRow = existingClientsButton.closest('tr');

    expect(existingClientsRow).not.toBeNull();
    expect(existingClientsRow).toHaveAttribute('aria-level', '4');
    expect(existingClientsRow).toHaveAttribute('aria-posinset', '1');
    expect(existingClientsRow).toHaveAttribute('aria-setsize', '3');
    expect(existingClientsRow).not.toHaveAttribute('aria-expanded');

    const newOrganicButton = screen.getByRole('button', {
      name: /New organic, channel, level 4/,
    });

    const newOrganicRow = newOrganicButton.closest('tr');

    expect(newOrganicRow).not.toBeNull();
    expect(newOrganicRow).toHaveAttribute('aria-level', '4');
    expect(newOrganicRow).toHaveAttribute('aria-posinset', '2');
    expect(newOrganicRow).toHaveAttribute('aria-setsize', '3');
    expect(newOrganicRow).not.toHaveAttribute('aria-expanded');
  });
});
