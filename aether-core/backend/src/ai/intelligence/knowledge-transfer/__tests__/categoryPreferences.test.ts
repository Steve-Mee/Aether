import {
  isKnowledgeTransferEnabledForCategory,
  getCategoryPreferences,
  updateCategoryPreferences,
} from '../categoryPreferences';

jest.mock('../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from '../../../../shared/prisma/client';

describe('categoryPreferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'true';
  });

  describe('isKnowledgeTransferEnabledForCategory', () => {
    it('returns false when env is disabled', async () => {
      process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'false';
      const enabled = await isKnowledgeTransferEnabledForCategory('tenant-1', 'pricing');
      expect(enabled).toBe(false);
    });

    it('returns false when tenant has KT disabled', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        brainKnowledgeTransferEnabled: false,
        proactivePrefs: {},
      });

      const enabled = await isKnowledgeTransferEnabledForCategory('tenant-1', 'pricing');
      expect(enabled).toBe(false);
    });

    it('returns false when category is opted out', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        brainKnowledgeTransferEnabled: true,
        proactivePrefs: {
          knowledgeTransferCategories: {
            pricing: false,
          },
        },
      });

      const enabled = await isKnowledgeTransferEnabledForCategory('tenant-1', 'pricing');
      expect(enabled).toBe(false);
    });

    it('returns true when category is enabled (default)', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        brainKnowledgeTransferEnabled: true,
        proactivePrefs: {},
      });

      const enabled = await isKnowledgeTransferEnabledForCategory('tenant-1', 'pricing');
      expect(enabled).toBe(true);
    });

    it('returns true when category is explicitly enabled', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        brainKnowledgeTransferEnabled: true,
        proactivePrefs: {
          knowledgeTransferCategories: {
            pricing: true,
          },
        },
      });

      const enabled = await isKnowledgeTransferEnabledForCategory('tenant-1', 'pricing');
      expect(enabled).toBe(true);
    });
  });

  describe('getCategoryPreferences', () => {
    it('returns default preferences when no settings exist', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue(null);

      const prefs = await getCategoryPreferences('tenant-1');
      expect(prefs).toEqual({
        pricing: true,
        conversion: true,
        trend: true,
        inventory: true,
        marketing: true,
      });
    });

    it('returns stored preferences', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        proactivePrefs: {
          knowledgeTransferCategories: {
            pricing: false,
            marketing: false,
          },
        },
      });

      const prefs = await getCategoryPreferences('tenant-1');
      expect(prefs.pricing).toBe(false);
      expect(prefs.marketing).toBe(false);
      expect(prefs.conversion).toBe(true);
    });
  });

  describe('updateCategoryPreferences', () => {
    it('updates category preferences', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        proactivePrefs: {
          knowledgeTransferCategories: {
            pricing: true,
          },
        },
      });

      (prisma.tenantSettings.upsert as jest.Mock).mockResolvedValue({});

      await updateCategoryPreferences('tenant-1', {
        pricing: false,
        marketing: false,
      });

      expect(prisma.tenantSettings.upsert).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        create: expect.objectContaining({
          proactivePrefs: expect.objectContaining({
            knowledgeTransferCategories: expect.objectContaining({
              pricing: false,
              marketing: false,
            }),
          }),
        }),
        update: expect.objectContaining({
          proactivePrefs: expect.objectContaining({
            knowledgeTransferCategories: expect.objectContaining({
              pricing: false,
              marketing: false,
            }),
          }),
        }),
      });
    });

    it('preserves existing proactivePrefs', async () => {
      (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
        tenantId: 'tenant-1',
        proactivePrefs: {
          someOtherSetting: 'value',
          knowledgeTransferCategories: {
            pricing: true,
          },
        },
      });

      await updateCategoryPreferences('tenant-1', { conversion: false });

      const call = (prisma.tenantSettings.upsert as jest.Mock).mock.calls[0][0];
      expect(call.update.proactivePrefs).toHaveProperty('someOtherSetting', 'value');
    });
  });
});
