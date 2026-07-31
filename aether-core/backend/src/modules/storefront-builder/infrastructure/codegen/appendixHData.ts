/**
 * Appendix H — canonical SitePlan + page trees (playbook).
 * Normative contract for AllowlistCodegenCompiler and P06 agent fallbacks.
 */

export const APPENDIX_H_PLAN = {
  version: 1 as const,
  localeDefault: 'nl-NL',
  locales: ['nl-NL'],
  brand: {
    name: 'Atelier Noord',
    primaryColor: '#3D2B1F',
    accentColor: '#C4A484',
  },
  pages: [
    { path: '/', title: 'Home', template: 'home' },
    { path: '/products', title: 'Collectie', template: 'collection' },
    { path: '/products/:slug', title: 'Product', template: 'pdp' },
    { path: '/about', title: 'Over ons', template: 'about' },
    { path: '/contact', title: 'Contact', template: 'contact' },
    { path: '/legal', title: 'Legal', template: 'legal' },
  ],
} as const;

export const APPENDIX_H_TOKENS = {
  color: {
    primary: '#3D2B1F',
    accent: '#C4A484',
    bg: '#FAF7F2',
    text: '#1A1A1A',
  },
  font: {
    display: 'Georgia, serif',
    body: 'system-ui, sans-serif',
  },
  radius: { md: '0.5rem' },
} as const;

export const APPENDIX_H_HOME_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [
          { label: 'Collectie', href: '/products' },
          { label: 'Over ons', href: '/about' },
        ],
      },
    },
    {
      type: 'Hero',
      props: {
        headline: 'Handmade keramiek',
        subheadline: 'Rustiek. Eerlijk. Lokaal.',
        ctaLabel: 'Shop collectie',
        ctaHref: '/products',
      },
    },
    {
      type: 'ProductGrid',
      props: { source: 'featured', limit: 8 },
    },
    {
      type: 'FAQ',
      props: {
        items: [{ q: 'Verzendtijd?', a: '2–4 werkdagen in NL.' }],
      },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** pages/products.tree.json (collection) */
export const APPENDIX_H_PRODUCTS_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [
          { label: 'Home', href: '/' },
          { label: 'Collectie', href: '/products' },
        ],
      },
    },
    {
      type: 'Hero',
      props: {
        headline: 'Collectie',
        subheadline: 'Alle stukken uit het atelier.',
        ctaLabel: 'Terug',
        ctaHref: '/',
      },
    },
    {
      type: 'CollectionFilter',
      props: { facets: ['materiaal', 'kleur'] },
    },
    {
      type: 'ProductGrid',
      props: { source: 'all', limit: 24 },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** pages/products.[slug].tree.json (PDP) */
export const APPENDIX_H_PDP_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [{ label: 'Collectie', href: '/products' }],
      },
    },
    {
      type: 'ProductDetail',
      props: { showAddToCart: true },
    },
    {
      type: 'TrustBadges',
      props: { items: ['Handgemaakt', 'NL verzending'] },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** pages/about.tree.json */
export const APPENDIX_H_ABOUT_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [
          { label: 'Home', href: '/' },
          { label: 'Collectie', href: '/products' },
        ],
      },
    },
    {
      type: 'RichText',
      props: { copyKey: 'about.body' },
    },
    {
      type: 'ImageBand',
      props: { alt: 'Atelier', srcKey: 'about.hero' },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** pages/contact.tree.json */
export const APPENDIX_H_CONTACT_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [{ label: 'Home', href: '/' }],
      },
    },
    {
      type: 'Hero',
      props: {
        headline: 'Contact',
        subheadline: 'Vragen over bestellingen of custom werk.',
        ctaLabel: 'Mail ons',
        ctaHref: 'mailto:hallo@atelier-noord.example',
      },
    },
    {
      type: 'ContactForm',
      props: { fields: ['name', 'email', 'message'] },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** pages/legal.tree.json */
export const APPENDIX_H_LEGAL_TREE = {
  type: 'Page' as const,
  children: [
    {
      type: 'Nav',
      props: {
        links: [{ label: 'Home', href: '/' }],
      },
    },
    {
      type: 'LegalText',
      props: { copyKey: 'legal.body' },
    },
    {
      type: 'Footer',
      props: { text: '© Atelier Noord' },
    },
  ],
} as const;

/** copy/nl.json — flat locale keys (emitted under SitePlan.copy[locale]) */
export const APPENDIX_H_COPY_NL = {
  'about.body':
    'Atelier Noord maakt handmade keramiek in kleine series. Elke kom wordt met de hand gedraaid.',
  'legal.body':
    'Algemene voorwaarden, privacy en retourbeleid. Placeholder Birth copy — vervang via STORE_ITERATE.',
  'home.hero.headline': 'Handmade keramiek',
  'product.cta': 'In winkelwagen',
} as const;

export const APPENDIX_H_TREES_BY_TEMPLATE = {
  home: APPENDIX_H_HOME_TREE,
  collection: APPENDIX_H_PRODUCTS_TREE,
  pdp: APPENDIX_H_PDP_TREE,
  about: APPENDIX_H_ABOUT_TREE,
  contact: APPENDIX_H_CONTACT_TREE,
  legal: APPENDIX_H_LEGAL_TREE,
} as const;

export type AppendixHTemplate = keyof typeof APPENDIX_H_TREES_BY_TEMPLATE;
