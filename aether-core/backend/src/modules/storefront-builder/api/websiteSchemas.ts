import { z } from 'zod';
import {
  STOREFRONT_SLUG_MESSAGE,
  storefrontSlugZodCheck,
} from '../domain/validateStorefrontSlug';

export const createProjectSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(63)
    .refine(storefrontSlugZodCheck, { message: STOREFRONT_SLUG_MESSAGE }),
  brief: z
    .object({
      prompt: z.string().optional(),
      localeDefault: z.string().optional(),
      locales: z.array(z.string()).optional(),
      tone: z.string().optional(),
      audience: z.string().optional(),
      mustHavePages: z.array(z.string()).optional(),
      brand: z.record(z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
  primaryDomain: z.string().nullable().optional(),
});

export const createRevisionSchema = z.object({
  parentRevisionId: z.string().optional().nullable(),
  deltaPrompt: z.string().optional(),
  briefPatch: z.record(z.unknown()).optional(),
  brief: z.unknown().optional(),
  plan: z.unknown().optional(),
});

export const pageCopySchema = z
  .object({
    headline: z.string().min(1).max(500).optional(),
    subheadline: z.string().min(1).max(1000).optional(),
  })
  .refine((v) => Boolean(v.headline || v.subheadline), {
    message: 'headline or subheadline required',
  });

export const deployTargetSchema = z.object({
  deployTarget: z.object({
    provider: z.string().min(1),
    liveUrl: z.string().nullable().optional(),
    configJson: z.unknown().optional(),
  }),
});
