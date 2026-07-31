import { ProductVariant } from './ProductVariant';

export interface ProductMediaItem {
  id: string;
  mediaAssetId: string;
  url: string;
  mimeType: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  status: string;
  price: number;
  stock: number;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryId: string | null;
  createdAt: Date;
  updatedAt: Date;
  variants: ProductVariant[];
  media: ProductMediaItem[];
}
