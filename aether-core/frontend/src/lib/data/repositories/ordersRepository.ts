import { getDataAdapter } from '../createDataAdapter';

export const ordersRepository = {
  list: () => getDataAdapter().fetchOrders(),
};
