import { AdminDataPort } from '../../application/ports/AdminDataPort';
import * as catalog from './adminData/prismaAdminCatalogQueries';
import * as customer from './adminData/prismaAdminCustomerQueries';
import * as analytics from './adminData/prismaAdminAnalyticsQueries';
import * as ops from './adminData/prismaAdminOpsQueries';
import * as tenant from './adminData/prismaAdminTenantQueries';

export class PrismaAdminDataAdapter implements AdminDataPort {
  countProducts = catalog.countProducts;
  countLowMarginProducts = catalog.countLowMarginProducts;
  updateProductPrices = catalog.updateProductPrices;
  listInventoryItems = catalog.listInventoryItems;
  countForecasts = catalog.countForecasts;
  listForecasts = catalog.listForecasts;
  createSupplier = catalog.createSupplier;
  createProduct = catalog.createProduct;
  listSuppliers = catalog.listSuppliers;
  listLowStockInventory = catalog.listLowStockInventory;
  listProductsForBrain = catalog.listProductsForBrain;
  searchProductsByName = catalog.searchProductsByName;
  updateProductPricesByIds = catalog.updateProductPricesByIds;
  restoreProductPrices = catalog.restoreProductPrices;
  applyRestockUpdates = catalog.applyRestockUpdates;
  listActiveNegotiations = catalog.listActiveNegotiations;
  getNegotiationDetail = catalog.getNegotiationDetail;

  listRecentOrders = customer.listRecentOrders;
  listRecentOrdersDetailed = customer.listRecentOrdersDetailed;
  countCustomers = customer.countCustomers;
  getTopCustomers = customer.getTopCustomers;
  getOrderTrends = customer.getOrderTrends;
  listCustomers = customer.listCustomers;
  getCustomerById = customer.getCustomerById;
  getCustomerSegments = customer.getCustomerSegments;
  getChurnSignals = customer.getChurnSignals;

  getMarginMetrics = analytics.getMarginMetrics;
  getCategoryRevenue = analytics.getCategoryRevenue;
  getInventoryCostSummary = analytics.getInventoryCostSummary;

  countEmailsByStatus = ops.countEmailsByStatus;
  countOutcomesByStatus = ops.countOutcomesByStatus;
  countPendingApprovals = ops.countPendingApprovals;
  listPendingApprovals = ops.listPendingApprovals;
  approveLowRisk = ops.approveLowRisk;
  findLatestProposedOutcome = ops.findLatestProposedOutcome;
  countRecentCommands = ops.countRecentCommands;

  getTenantDisplayName = tenant.getTenantDisplayName;
  upsertPushSubscription = tenant.upsertPushSubscription;
  deletePushSubscriptionByEndpoint = tenant.deletePushSubscriptionByEndpoint;
}
