import { getDataAdapter } from '../createDataAdapter';

export const productsRepository = {
  list: () => getDataAdapter().fetchProducts(),
};
