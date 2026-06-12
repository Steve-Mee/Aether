import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import ApprovalCard from '../ApprovalCard';
import { renderWithProviders } from '@/test/render';
import { buildHighRiskApproval } from '@/test/factories/approval';
import { enrichApproval } from '@/lib/approvalPresentation';

describe('ApprovalCard integration', () => {
  const highRiskEnriched = enrichApproval(buildHighRiskApproval());

  it('hides approve/reject actions when high-risk and allowHighRiskActions is false', () => {
    renderWithProviders(
      <ApprovalCard
        enriched={highRiskEnriched}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        allowHighRiskActions={false}
      />,
    );

    expect(screen.getByTestId(`approval-card-${highRiskEnriched.item.id}`)).toBeInTheDocument();
    expect(
      screen.queryByTestId(`approval-approve-${highRiskEnriched.item.id}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`approval-reject-${highRiskEnriched.item.id}`),
    ).not.toBeInTheDocument();
  });

  it('shows approve/reject actions when high-risk and allowHighRiskActions is true', () => {
    renderWithProviders(
      <ApprovalCard
        enriched={highRiskEnriched}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        allowHighRiskActions
      />,
    );

    expect(screen.getByTestId(`approval-approve-${highRiskEnriched.item.id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`approval-reject-${highRiskEnriched.item.id}`)).toBeInTheDocument();
  });
});
