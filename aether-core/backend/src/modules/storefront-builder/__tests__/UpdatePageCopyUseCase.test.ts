import {
  UpdatePageCopyUseCase,
  PageNotFoundForCopyError,
} from '../application/use-cases/UpdatePageCopyUseCase';
import { SitePage } from '../domain/entities/SitePage';
import { SiteRevision } from '../domain/entities/SiteRevision';
import { BuildJob } from '../domain/entities/BuildJob';
import type { SiteRepository } from '../domain/repositories/SiteRepository';
import { CreateRevisionUseCase } from '../application/use-cases/CreateRevisionUseCase';

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

describe('UpdatePageCopyUseCase', () => {
  const now = new Date();
  const page = new SitePage(
    'page_1',
    'rev_1',
    '/',
    'Home',
    {},
    {
      type: 'Page',
      children: [
        { type: 'Hero', props: { headline: 'Old', subheadline: 'Sub' }, children: [] },
      ],
    },
    0,
    now,
    now
  );
  const revision = new SiteRevision(
    'rev_1',
    'proj_1',
    1,
    { prompt: 'x' },
    {
      pages: [
        {
          path: '/',
          title: 'Home',
          tree: {
            type: 'Page',
            children: [
              { type: 'Hero', props: { headline: 'Old', subheadline: 'Sub' }, children: [] },
            ],
          },
        },
      ],
    },
    'artifacts/rev_1',
    null,
    null,
    null,
    now
  );

  it('creates a new revision with patched Hero copy', async () => {
    const newRev = new SiteRevision(
      'rev_2',
      'proj_1',
      2,
      revision.briefJson,
      {},
      null,
      null,
      'merchant_page_copy_edit',
      'rev_1',
      now
    );
    const repo = {
      findPageById: jest.fn().mockResolvedValue(page),
      findRevisionById: jest.fn().mockResolvedValue(revision),
    } as unknown as SiteRepository;
    const createRevision = {
      execute: jest.fn().mockResolvedValue({
        revision: newRev,
        buildJob: new BuildJob('b1', 'rev_2', 'queued', null, null, null, null, now),
      }),
    } as unknown as CreateRevisionUseCase;

    const uc = new UpdatePageCopyUseCase(repo, createRevision);
    const result = await uc.execute('tenant_a', 'page_1', { headline: 'New headline' });

    expect(result.pagePath).toBe('/');
    expect(result.revision.id).toBe('rev_2');
    expect(createRevision.execute).toHaveBeenCalledWith(
      'tenant_a',
      'proj_1',
      expect.objectContaining({
        parentRevisionId: 'rev_1',
        createdByAgent: 'merchant_page_copy_edit',
        plan: expect.objectContaining({
          pages: [
            expect.objectContaining({
              path: '/',
              tree: expect.objectContaining({
                children: [
                  expect.objectContaining({
                    type: 'Hero',
                    props: expect.objectContaining({ headline: 'New headline' }),
                  }),
                ],
              }),
            }),
          ],
        }),
      })
    );
  });

  it('throws when page missing', async () => {
    const repo = {
      findPageById: jest.fn().mockResolvedValue(null),
    } as unknown as SiteRepository;
    const uc = new UpdatePageCopyUseCase(
      repo,
      { execute: jest.fn() } as unknown as CreateRevisionUseCase
    );
    await expect(uc.execute('tenant_a', 'missing', { headline: 'x' })).rejects.toBeInstanceOf(
      PageNotFoundForCopyError
    );
  });
});
