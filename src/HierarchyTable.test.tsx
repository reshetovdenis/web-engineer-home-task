import {
  cleanup,
  render,
  screen,
  within,
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
import company from '../data/company.json';

afterEach(() => {
  cleanup();
});

describe('HierarchyTable', () => {
  it('expands and collapses nested rows with keyboard controls', async () => {
    const user = userEvent.setup();

    render(
      <HierarchyTable
        root={company}
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
    ).toHaveLength(12);

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

  it('exposes hierarchy depth, sibling position, size, and expansion state to assistive technology', async () => {
    const user = userEvent.setup();

    render(
      <HierarchyTable
        root={company}
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

    const branch3Button = screen.getByRole('button', {
      name: 'Branch 3, branch, level 2, child row; show in chart',
    });

    const branch3Row = branch3Button.closest('tr');

    expect(branch3Row).not.toBeNull();
    expect(branch3Row).toHaveAttribute('aria-level', '2');
    expect(branch3Row).toHaveAttribute('aria-posinset', '3');
    expect(branch3Row).toHaveAttribute('aria-setsize', '3');
    expect(branch3Row).not.toHaveAttribute('aria-expanded');

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