import { ProductIdea } from '../../domain/entities/ProductIdea';

/**
 * Experimental fixture generator — not live trend analysis or LLM output.
 * Ideas are static samples labeled `source: 'fixture'` for intellectual honesty.
 * Gated by predictive-commerce experimental status in the API layer.
 */
export class ProductGenesisService {
  async generateProductIdeas(limit: number = 5): Promise<ProductIdea[]> {
    const ideas: ProductIdea[] = [
      new ProductIdea(
        'idea_001',
        'Eco-Friendly Summer Sneakers',
        'Sustainable sneakers made from recycled ocean plastic with cooling technology',
        'footwear',
        89.99,
        42,
        0.91,
        'fixture'
      ),
      new ProductIdea(
        'idea_002',
        'Limited Edition Y2K Hoodie',
        'Oversized hoodie with retro 2000s graphics and premium heavy cotton',
        'apparel',
        74.50,
        38,
        0.87,
        'fixture'
      ),
      new ProductIdea(
        'idea_003',
        'Smart Water Bottle 2.0',
        'Hydration tracking bottle with app integration and temperature control',
        'accessories',
        49.99,
        55,
        0.82,
        'fixture'
      ),
    ];

    return ideas.slice(0, limit);
  }
}
