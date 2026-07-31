import { SiteRevision } from '../domain/entities/SiteRevision';
import {
  ProposePublishUseCase,
  QaBelowThresholdError,
  QA_PUBLISH_THRESHOLD,
} from '../application/use-cases/ProposePublishUseCase';
import { RevisionNotFoundError } from '../application/use-cases/ListPagesUseCase';

function revision(qa: unknown) {
  return new SiteRevision(
    'rev_1',
    'proj_1',
    1,
    {},
    {},
    null,
    qa,
    null,
    null,
    new Date()
  );
}

describe('ProposePublishUseCase', () => {
  const publishApproval = {
    proposePublish: jest.fn(),
  };
  const siteRepository = {
    findRevisionById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    publishApproval.proposePublish.mockResolvedValue({
      id: 'appr_1',
      type: 'PUBLISH_STOREFRONT',
      status: 'pending',
      payload: { projectId: 'proj_1', revisionId: 'rev_1', qaScore: 0.92 },
    });
  });

  it('creates pending approval when qaScore >= 0.80', async () => {
    siteRepository.findRevisionById.mockResolvedValue(revision({ score: 0.92 }));
    const uc = new ProposePublishUseCase(siteRepository as never, publishApproval);

    const result = await uc.execute('tenant_a', 'rev_1', { requestedBy: 'actor_1' });

    expect(result.approval.status).toBe('pending');
    expect(publishApproval.proposePublish).toHaveBeenCalledWith({
      tenantId: 'tenant_a',
      projectId: 'proj_1',
      revisionId: 'rev_1',
      qaScore: 0.92,
      requestedBy: 'actor_1',
    });
  });

  it('rejects qaScore below threshold', async () => {
    siteRepository.findRevisionById.mockResolvedValue(revision({ score: 0.79 }));
    const uc = new ProposePublishUseCase(siteRepository as never, publishApproval);

    await expect(uc.execute('tenant_a', 'rev_1')).rejects.toBeInstanceOf(QaBelowThresholdError);
    expect(publishApproval.proposePublish).not.toHaveBeenCalled();
  });

  it('rejects missing qa score', async () => {
    siteRepository.findRevisionById.mockResolvedValue(revision({ status: 'pending' }));
    const uc = new ProposePublishUseCase(siteRepository as never, publishApproval);

    await expect(uc.execute('tenant_a', 'rev_1')).rejects.toMatchObject({
      name: 'QaBelowThresholdError',
      qaScore: null,
    });
    expect(QA_PUBLISH_THRESHOLD).toBe(0.8);
  });

  it('throws when revision missing', async () => {
    siteRepository.findRevisionById.mockResolvedValue(null);
    const uc = new ProposePublishUseCase(siteRepository as never, publishApproval);

    await expect(uc.execute('tenant_a', 'missing')).rejects.toBeInstanceOf(RevisionNotFoundError);
  });
});
