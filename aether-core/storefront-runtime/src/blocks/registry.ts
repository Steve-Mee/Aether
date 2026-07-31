import type { ComponentType } from 'react';
import type { BlockProps } from './types';
import { Hero } from './Hero';
import { LogoBar } from './LogoBar';
import { ProductGrid } from './ProductGrid';
import { ProductDetail } from './ProductDetail';
import { RichText } from './RichText';
import { ImageBand } from './ImageBand';
import { FAQ } from './FAQ';
import { Testimonials } from './Testimonials';
import { NewsletterSignup } from './NewsletterSignup';
import { Footer } from './Footer';
import { Nav } from './Nav';
import { CartDrawer } from './CartDrawer';
import { CheckoutShell } from './CheckoutShell';
import { LegalText } from './LegalText';
import { ContactForm } from './ContactForm';
import { CollectionFilter } from './CollectionFilter';
import { TrustBadges } from './TrustBadges';
import { UnknownBlock } from './UnknownBlock';

/**
 * Must stay in sync with backend ALLOWLISTED_BLOCK_TYPES
 * (storefront-builder.md §4.3).
 */
export const ALLOWLISTED_BLOCK_TYPES = [
  'Hero',
  'LogoBar',
  'ProductGrid',
  'ProductDetail',
  'RichText',
  'ImageBand',
  'FAQ',
  'Testimonials',
  'NewsletterSignup',
  'Footer',
  'Nav',
  'CartDrawer',
  'CheckoutShell',
  'LegalText',
  'ContactForm',
  'CollectionFilter',
  'TrustBadges',
] as const;

export type AllowlistedBlockType = (typeof ALLOWLISTED_BLOCK_TYPES)[number];

export const blockRegistry: Record<
  AllowlistedBlockType,
  ComponentType<BlockProps>
> = {
  Hero,
  LogoBar,
  ProductGrid,
  ProductDetail,
  RichText,
  ImageBand,
  FAQ,
  Testimonials,
  NewsletterSignup,
  Footer,
  Nav,
  CartDrawer,
  CheckoutShell,
  LegalText,
  ContactForm,
  CollectionFilter,
  TrustBadges,
};

export function resolveBlock(
  type: string
): ComponentType<BlockProps> {
  if (type in blockRegistry) {
    return blockRegistry[type as AllowlistedBlockType];
  }
  return UnknownBlock;
}
