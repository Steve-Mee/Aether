/**
 * Wave 18 Phase 2: enrich commerce/admin/platform OpenAPI with DTOs from code.
 * Run after generators. Idempotent — replaces components + patches known ops.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiDir = path.resolve(__dirname, '../openapi');

function load(name) {
  return yaml.load(fs.readFileSync(path.join(openapiDir, name), 'utf8'));
}

function save(name, doc) {
  const out = yaml.dump(doc, {
    lineWidth: 120,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  fs.writeFileSync(path.join(openapiDir, name), out, 'utf8');
  console.log(`Enriched ${name}`);
}

function jsonContent(schema) {
  return {
    content: {
      'application/json': { schema },
    },
  };
}

function ref(name) {
  return { $ref: `#/components/schemas/${name}` };
}

function ok(schema, description = 'OK') {
  return {
    description,
    ...jsonContent(schema),
  };
}

function err(description) {
  return { description };
}

function patchOp(doc, pathKey, method, patch) {
  const item = doc.paths?.[pathKey]?.[method];
  if (!item) {
    console.warn(`  skip missing ${method.toUpperCase()} ${pathKey}`);
    return;
  }
  Object.assign(item, patch);
}

function enrichCommerce() {
  const doc = load('commerce.yaml');
  doc.info.description = [
    'Merchant commerce REST under `/api/*` (auth + tenant required).',
    'Wave 18: path inventory + schemas from controllers/domain entities.',
  ].join('\n');

  doc.components = {
    schemas: {
      ProductMediaItem: {
        type: 'object',
        required: ['id', 'mediaAssetId', 'url', 'mimeType', 'alt', 'sortOrder'],
        properties: {
          id: { type: 'string' },
          mediaAssetId: { type: 'string' },
          url: { type: 'string' },
          mimeType: { type: 'string' },
          alt: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
        },
      },
      ProductVariant: {
        type: 'object',
        required: ['id', 'productId', 'sku', 'price', 'currency', 'stock'],
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          sku: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          stock: { type: 'integer' },
        },
      },
      ProductDetail: {
        type: 'object',
        required: [
          'id',
          'name',
          'description',
          'slug',
          'status',
          'price',
          'stock',
          'seoTitle',
          'seoDescription',
          'categoryId',
          'createdAt',
          'updatedAt',
          'variants',
          'media',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          slug: { type: 'string' },
          status: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'integer' },
          seoTitle: { type: 'string', nullable: true },
          seoDescription: { type: 'string', nullable: true },
          categoryId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          variants: { type: 'array', items: ref('ProductVariant') },
          media: { type: 'array', items: ref('ProductMediaItem') },
        },
      },
      CreateProductRequest: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string' },
          slug: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'integer' },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          slug: { type: 'string' },
          status: { type: 'string' },
          price: { type: 'number' },
          stock: { type: 'integer' },
          seoTitle: { type: 'string', nullable: true },
          seoDescription: { type: 'string', nullable: true },
          categoryId: { type: 'string', nullable: true },
        },
      },
      CreateVariantRequest: {
        type: 'object',
        required: ['sku', 'price'],
        properties: {
          sku: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          stock: { type: 'integer' },
        },
      },
      UpdateVariantRequest: {
        type: 'object',
        properties: {
          sku: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          stock: { type: 'integer' },
        },
      },
      OrderItem: {
        type: 'object',
        required: ['id', 'productId', 'quantity', 'price'],
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          quantity: { type: 'integer' },
          price: { type: 'number' },
          productName: { type: 'string' },
        },
      },
      Order: {
        type: 'object',
        required: [
          'id',
          'customerId',
          'status',
          'total',
          'currency',
          'createdAt',
          'updatedAt',
          'items',
        ],
        properties: {
          id: { type: 'string' },
          customerId: { type: 'string' },
          status: {
            type: 'string',
            enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
          },
          total: { type: 'number' },
          currency: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: ref('OrderItem') },
        },
      },
      OrderDetail: {
        allOf: [
          ref('Order'),
          {
            type: 'object',
            required: ['customer', 'shipments', 'refunds', 'payment'],
            properties: {
              customer: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                },
              },
              shipments: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'status', 'carrier', 'trackingNumber', 'shippedAt', 'createdAt'],
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    carrier: { type: 'string', nullable: true },
                    trackingNumber: { type: 'string', nullable: true },
                    shippedAt: { type: 'string', format: 'date-time', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              refunds: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'amount', 'currency', 'status', 'reason', 'createdAt'],
                  properties: {
                    id: { type: 'string' },
                    amount: { type: 'number' },
                    currency: { type: 'string' },
                    status: { type: 'string' },
                    reason: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
              payment: {
                type: 'object',
                nullable: true,
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  amount: { type: 'number' },
                  paymentMethod: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['customerId', 'items'],
        properties: {
          customerId: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'price'],
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'integer' },
                price: { type: 'number' },
              },
            },
          },
        },
      },
      ShipOrderRequest: {
        type: 'object',
        required: ['carrier', 'trackingNumber'],
        properties: {
          carrier: { type: 'string' },
          trackingNumber: { type: 'string' },
        },
      },
      CreateOrderRefundRequest: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
          reason: { type: 'string' },
        },
      },
      CustomerSegment: {
        type: 'object',
        required: ['id', 'email', 'name', 'segment', 'orderCount', 'totalSpent'],
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          segment: { type: 'string', enum: ['vip', 'at_risk', 'new', 'regular'] },
          orderCount: { type: 'integer' },
          totalSpent: { type: 'number' },
          lastOrderAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      CustomerDetail: {
        type: 'object',
        required: [
          'id',
          'email',
          'name',
          'firstName',
          'lastName',
          'createdAt',
          'orderCount',
          'totalSpent',
          'lastOrderAt',
          'segment',
          'churnRisk',
          'daysSinceLastOrder',
        ],
        properties: {
          id: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          firstName: { type: 'string', nullable: true },
          lastName: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          orderCount: { type: 'integer' },
          totalSpent: { type: 'number' },
          lastOrderAt: { type: 'string', format: 'date-time', nullable: true },
          segment: { type: 'string', enum: ['vip', 'at_risk', 'new', 'regular'] },
          churnRisk: { type: 'boolean' },
          daysSinceLastOrder: { type: 'integer', nullable: true },
        },
      },
      InventoryListItem: {
        type: 'object',
        required: [
          'id',
          'productId',
          'warehouseId',
          'quantity',
          'productName',
          'productSlug',
          'threshold',
          'status',
        ],
        properties: {
          id: { type: 'string' },
          productId: { type: 'string' },
          warehouseId: { type: 'string' },
          quantity: { type: 'integer' },
          productName: { type: 'string', nullable: true },
          productSlug: { type: 'string', nullable: true },
          threshold: { type: 'integer' },
          status: { type: 'string', enum: ['ok', 'low'] },
        },
      },
      AdjustInventoryRequest: {
        type: 'object',
        required: ['productId', 'quantity'],
        properties: {
          productId: { type: 'string' },
          quantity: { type: 'integer' },
          warehouseId: { type: 'string' },
        },
      },
      Promotion: {
        type: 'object',
        required: [
          'id',
          'tenantId',
          'name',
          'type',
          'value',
          'status',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['percent', 'fixed'] },
          value: { type: 'number' },
          status: {
            type: 'string',
            enum: ['draft', 'active', 'scheduled', 'ended', 'archived'],
          },
          code: { type: 'string', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
          configJson: { type: 'object', additionalProperties: true, nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreatePromotionRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['percent', 'fixed'] },
          value: { type: 'number' },
          code: { type: 'string', nullable: true },
          startsAt: { type: 'string', format: 'date-time', nullable: true },
          endsAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Payment: {
        type: 'object',
        required: [
          'id',
          'orderId',
          'amount',
          'currency',
          'status',
          'paymentMethod',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          orderId: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
          paymentMethod: { type: 'string' },
          transactionId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProcessPaymentRequest: {
        type: 'object',
        required: ['orderId', 'amount', 'paymentMethod'],
        properties: {
          orderId: { type: 'string' },
          amount: { type: 'number', minimum: 0, exclusiveMinimum: true },
          paymentMethod: { type: 'string' },
          idempotencyKey: { type: 'string' },
        },
      },
      ErrorBody: {
        type: 'object',
        properties: {
          error: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            ],
          },
        },
      },
    },
  };

  const authErr = { '401': err('Unauthorized'), '400': err('Bad request') };

  patchOp(doc, '/products', 'get', {
    responses: { '200': ok({ type: 'array', items: ref('ProductDetail') }), ...authErr },
  });
  patchOp(doc, '/products', 'post', {
    requestBody: { required: true, ...jsonContent(ref('CreateProductRequest')) },
    responses: {
      '201': ok(ref('ProductDetail'), 'Created'),
      '400': ok(ref('ErrorBody'), 'Bad request'),
      '401': err('Unauthorized'),
    },
  });
  patchOp(doc, '/products/{id}', 'get', {
    responses: {
      '200': ok(ref('ProductDetail')),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/products/{id}', 'patch', {
    requestBody: { required: true, ...jsonContent(ref('UpdateProductRequest')) },
    responses: {
      '200': ok(ref('ProductDetail')),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/products/{id}', 'delete', {
    responses: { '204': { description: 'Deleted' }, ...authErr },
  });
  patchOp(doc, '/products/{id}/variants', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['variants'],
        properties: { variants: { type: 'array', items: ref('ProductVariant') } },
      }),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/products/{id}/variants', 'post', {
    requestBody: { required: true, ...jsonContent(ref('CreateVariantRequest')) },
    responses: {
      '201': ok(ref('ProductVariant'), 'Created'),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/products/{id}/variants/{variantId}', 'patch', {
    requestBody: { required: true, ...jsonContent(ref('UpdateVariantRequest')) },
    responses: {
      '200': ok(ref('ProductVariant')),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/products/{id}/variants/{variantId}', 'delete', {
    responses: { '204': { description: 'Deleted' }, ...authErr },
  });
  patchOp(doc, '/products/{id}/media', 'post', {
    responses: {
      '201': ok({
        type: 'object',
        required: ['product'],
        properties: { product: ref('ProductDetail') },
      }, 'Created'),
      ...authErr,
    },
  });

  patchOp(doc, '/orders', 'get', {
    responses: { '200': ok({ type: 'array', items: ref('Order') }), ...authErr },
  });
  patchOp(doc, '/orders', 'post', {
    requestBody: { required: true, ...jsonContent(ref('CreateOrderRequest')) },
    responses: {
      '201': ok(ref('Order'), 'Created'),
      '500': ok(ref('ErrorBody'), 'Server error'),
      ...authErr,
    },
  });
  patchOp(doc, '/orders/{id}', 'get', {
    responses: {
      '200': ok(ref('OrderDetail')),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/orders/{id}/ship', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ShipOrderRequest')) },
    responses: {
      '201': ok({
        type: 'object',
        required: ['shipment', 'order'],
        properties: {
          shipment: { type: 'object', additionalProperties: true },
          order: { allOf: [ref('OrderDetail')], nullable: true },
        },
      }, 'Created'),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/orders/{id}/refunds', 'post', {
    requestBody: { required: true, ...jsonContent(ref('CreateOrderRefundRequest')) },
    responses: {
      '201': ok({
        type: 'object',
        required: ['refund', 'approval'],
        properties: {
          refund: { type: 'object', additionalProperties: true },
          approval: {
            type: 'object',
            nullable: true,
            properties: { id: { type: 'string' }, status: { type: 'string' } },
          },
        },
      }, 'Created'),
      '400': ok(ref('ErrorBody'), 'Bad request'),
      '404': ok(ref('ErrorBody'), 'Not found'),
      '401': err('Unauthorized'),
    },
  });
  patchOp(doc, '/orders/{id}/status', 'patch', {
    requestBody: {
      required: true,
      ...jsonContent({
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'string' } },
      }),
    },
    responses: { '200': ok(ref('Order')), ...authErr },
  });

  patchOp(doc, '/customers', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['customers'],
        properties: { customers: { type: 'array', items: ref('CustomerSegment') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/customers/{id}', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['customer'],
        properties: { customer: ref('CustomerDetail') },
      }),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });
  patchOp(doc, '/customers/{id}/orders', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['orders'],
        properties: { orders: { type: 'array', items: ref('Order') } },
      }),
      '404': ok(ref('ErrorBody'), 'Not found'),
      ...authErr,
    },
  });

  patchOp(doc, '/inventory', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['items'],
        properties: { items: { type: 'array', items: ref('InventoryListItem') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/inventory/adjust', 'post', {
    requestBody: { required: true, ...jsonContent(ref('AdjustInventoryRequest')) },
    responses: {
      '200': ok({
        type: 'object',
        required: ['success', 'adjustment'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          adjustment: {
            type: 'object',
            required: ['productId', 'warehouseId', 'quantity'],
            properties: {
              productId: { type: 'string' },
              warehouseId: { type: 'string' },
              quantity: { type: 'integer' },
            },
          },
        },
      }),
      ...authErr,
    },
  });

  patchOp(doc, '/promotions', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['status', 'promotions'],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          promotions: { type: 'array', items: ref('Promotion') },
        },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/promotions', 'post', {
    requestBody: { required: true, ...jsonContent(ref('CreatePromotionRequest')) },
    responses: {
      '201': ok({
        type: 'object',
        required: ['status', 'promotion'],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          promotion: ref('Promotion'),
        },
      }, 'Created'),
      '400': ok(ref('ErrorBody'), 'Bad request'),
      '401': err('Unauthorized'),
    },
  });

  patchOp(doc, '/payments', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['status', 'provider', 'payments'],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          provider: { type: 'string' },
          payments: { type: 'array', items: ref('Payment') },
        },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/payments/payment', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ProcessPaymentRequest')) },
    responses: {
      '200': ok({
        type: 'object',
        required: ['status', 'success', 'payment'],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          success: { type: 'boolean' },
          payment: ref('Payment'),
        },
      }),
      '500': ok(ref('ErrorBody'), 'Server error'),
      ...authErr,
    },
  });
  patchOp(doc, '/payments/summary', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: [
          'status',
          'provider',
          'connectConfigured',
          'paymentCount',
          'byStatus',
          'paidAmount',
          'failedCount',
          'currency',
        ],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          provider: { type: 'string' },
          connectConfigured: { type: 'boolean' },
          paymentCount: { type: 'integer' },
          byStatus: {
            type: 'object',
            properties: {
              pending: { type: 'integer' },
              paid: { type: 'integer' },
              failed: { type: 'integer' },
              refunded: { type: 'integer' },
            },
          },
          paidAmount: { type: 'number' },
          failedCount: { type: 'integer' },
          currency: { type: 'string' },
        },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/payments/refund', 'post', {
    requestBody: {
      required: true,
      ...jsonContent({
        type: 'object',
        required: ['paymentId'],
        properties: {
          paymentId: { type: 'string' },
          amount: { type: 'number' },
        },
      }),
    },
    responses: {
      '200': ok({
        type: 'object',
        required: ['success', 'message'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          message: { type: 'string' },
        },
      }),
      '400': ok(ref('ErrorBody'), 'Bad request'),
      '401': err('Unauthorized'),
    },
  });

  save('commerce.yaml', doc);
}

function enrichAdmin() {
  const doc = load('admin.yaml');
  doc.info.description = [
    'Admin API under `/api/admin/*` (auth + tenant required).',
    'Wave 18: includes `/bilateral/audit` and enriched command/overview schemas.',
  ].join('\n');

  doc.components = {
    schemas: {
      ExecuteCommandRequest: {
        type: 'object',
        required: ['command'],
        properties: {
          command: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
      CommandOutcome: {
        type: 'object',
        required: [
          'success',
          'originalCommand',
          'parsedIntent',
          'action',
          'result',
          'confidence',
          'timestamp',
          'commandId',
          'undoable',
        ],
        properties: {
          success: { type: 'boolean' },
          originalCommand: { type: 'string' },
          parsedIntent: { type: 'string' },
          action: { type: 'string' },
          result: {},
          confidence: { type: 'number' },
          verifiedUplift: {},
          timestamp: { type: 'string', format: 'date-time' },
          commandId: { type: 'string' },
          undoable: { type: 'boolean' },
          undoExpiresAt: { type: 'string', format: 'date-time' },
          requiresApproval: { type: 'boolean' },
          riskBand: { type: 'string', enum: ['low', 'medium', 'high'] },
          brain: {
            type: 'object',
            additionalProperties: true,
            properties: {
              specialist: { type: 'string' },
              agents: { type: 'array', items: { type: 'string' } },
              executionMode: { type: 'string' },
              handoffChain: { type: 'array', items: {} },
              agentContributions: {},
              actionConflicts: {},
              synthesisSource: { type: 'string' },
            },
          },
        },
        additionalProperties: true,
      },
      OverviewFeedItem: {
        type: 'object',
        required: ['kind', 'at', 'id', 'cursor', 'payload'],
        properties: {
          kind: {
            type: 'string',
            enum: [
              'activity',
              'proactive',
              'approval',
              'goal_snapshot',
              'goal_completed',
              'agent_handoff',
            ],
          },
          at: { type: 'string', format: 'date-time' },
          id: { type: 'string' },
          cursor: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
        },
      },
      OverviewFeedResponse: {
        type: 'object',
        required: ['items', 'nextCursor', 'hasMore', 'meta'],
        properties: {
          items: { type: 'array', items: ref('OverviewFeedItem') },
          nextCursor: { type: 'string', nullable: true },
          hasMore: { type: 'boolean' },
          meta: {
            type: 'object',
            required: ['pendingApprovals', 'proactiveCount', 'activeGoals'],
            properties: {
              pendingApprovals: { type: 'integer' },
              proactiveCount: { type: 'integer' },
              activeGoals: { type: 'integer' },
            },
          },
        },
      },
      BilateralAdminAuditRecord: {
        type: 'object',
        required: ['id', 'contractId', 'action', 'actorTenantId', 'recordCount', 'fieldHash', 'createdAt'],
        properties: {
          id: { type: 'string' },
          contractId: { type: 'string' },
          action: { type: 'string' },
          actorTenantId: { type: 'string' },
          recordCount: { type: 'integer' },
          fieldHash: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  };

  const authErr = { '401': err('Unauthorized'), '400': err('Bad request') };

  patchOp(doc, '/command', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ExecuteCommandRequest')) },
    responses: {
      '200': ok(ref('CommandOutcome')),
      ...authErr,
    },
  });
  patchOp(doc, '/overview', 'get', {
    parameters: [
      { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
      { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
      { name: 'cursor', in: 'query', schema: { type: 'string' } },
      { name: 'agentKey', in: 'query', schema: { type: 'string' } },
      { name: 'risk', in: 'query', schema: { type: 'string', enum: ['high', 'low'] } },
      {
        name: 'executionMode',
        in: 'query',
        schema: {
          type: 'string',
          enum: ['autonomous', 'approval_required', 'inform_only'],
        },
      },
      {
        name: 'actionType',
        in: 'query',
        schema: {
          type: 'string',
          enum: ['proactive', 'autonomous', 'goal', 'approval'],
        },
      },
      { name: 'module', in: 'query', schema: { type: 'string' } },
      { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 } },
    ],
    responses: { '200': ok(ref('OverviewFeedResponse')), ...authErr },
  });
  patchOp(doc, '/bilateral/audit', 'get', {
    parameters: [
      { name: 'contractId', in: 'query', schema: { type: 'string' } },
    ],
    responses: {
      '200': ok({
        type: 'object',
        required: ['audit'],
        properties: {
          audit: { type: 'array', items: ref('BilateralAdminAuditRecord') },
        },
      }),
      ...authErr,
    },
  });

  save('admin.yaml', doc);
}

function enrichPlatform() {
  const doc = load('platform.yaml');
  doc.info.description = [
    'Always-on platform REST under `/api/*` (auth + tenant required except auth login/refresh).',
    'Wave 18: enriched bilateral, emails, suppliers, approvals; other mounts remain thin.',
    'Excluded (feature-gated experimental): predictive, self-evolving, agentic, physical, co-ownership.',
  ].join('\n');

  doc.components = {
    schemas: {
      EmailMessage: {
        type: 'object',
        required: ['id', 'from', 'subject', 'body', 'status', 'riskLevel', 'createdAt'],
        properties: {
          id: { type: 'string' },
          from: { type: 'string' },
          subject: { type: 'string' },
          body: { type: 'string' },
          status: { type: 'string' },
          riskLevel: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          approvalId: { type: 'string' },
          contextSource: { type: 'string' },
          autoSent: { type: 'boolean' },
        },
      },
      ProcessEmailRequest: {
        type: 'object',
        required: ['from'],
        properties: {
          from: { type: 'string', format: 'email' },
          subject: { type: 'string' },
          body: { type: 'string' },
          messageId: { type: 'string' },
        },
      },
      EmailMetrics: {
        type: 'object',
        required: [
          'status',
          'classificationSourceNote',
          'totalProcessed',
          'classifiedCount',
          'classificationRate',
          'escalatedCount',
          'escalationRate',
          'autoRepliedCount',
          'pilotProcessedCount',
          'autoReplyRate',
          'rollbackCount',
          'rollbackRate',
          'classificationSource',
          'targetsMet',
        ],
        properties: {
          status: { type: 'string', enum: ['partial'] },
          classificationSourceNote: { type: 'string' },
          totalProcessed: { type: 'integer' },
          classifiedCount: { type: 'integer' },
          classificationRate: { type: 'number' },
          escalatedCount: { type: 'integer' },
          escalationRate: { type: 'number' },
          autoRepliedCount: { type: 'integer' },
          pilotProcessedCount: { type: 'integer' },
          autoReplyRate: { type: 'number' },
          rollbackCount: { type: 'integer' },
          rollbackRate: { type: 'number' },
          classificationSource: {
            type: 'object',
            properties: {
              ollama: { type: 'integer' },
              heuristic: { type: 'integer' },
            },
          },
          targetsMet: {
            type: 'object',
            properties: {
              classificationAbove60Pct: { type: 'boolean' },
              escalationBelow15Pct: { type: 'boolean' },
              autoReplyAbove70Pct: { type: 'boolean' },
            },
          },
        },
      },
      BilateralSchema: {
        type: 'object',
        required: ['id', 'schemaKey', 'fields', 'description'],
        properties: {
          id: { type: 'string' },
          schemaKey: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
        },
      },
      BilateralContract: {
        type: 'object',
        required: [
          'id',
          'status',
          'role',
          'providerTenantId',
          'consumerTenantId',
          'partnerTenantId',
          'partnerName',
          'partnerSlug',
          'schemaKey',
          'schemaDescription',
          'allowedFields',
          'allowedFieldCount',
          'ttlExpiresAt',
          'consentProviderAt',
          'consentConsumerAt',
          'consentComplete',
          'revokedAt',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'string' },
          status: { type: 'string' },
          role: { type: 'string', enum: ['provider', 'consumer'] },
          providerTenantId: { type: 'string' },
          consumerTenantId: { type: 'string' },
          partnerTenantId: { type: 'string' },
          partnerName: { type: 'string' },
          partnerSlug: { type: 'string' },
          schemaKey: { type: 'string' },
          schemaDescription: { type: 'string' },
          allowedFields: { type: 'array', items: { type: 'string' } },
          allowedFieldCount: { type: 'integer' },
          ttlExpiresAt: { type: 'string', format: 'date-time', nullable: true },
          consentProviderAt: { type: 'string', format: 'date-time', nullable: true },
          consentConsumerAt: { type: 'string', format: 'date-time', nullable: true },
          consentComplete: { type: 'boolean' },
          revokedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProposeContractRequest: {
        type: 'object',
        required: ['schemaKey', 'allowedFields'],
        properties: {
          consumerTenantId: { type: 'string' },
          consumerTenantSlug: { type: 'string' },
          schemaKey: { type: 'string' },
          allowedFields: { type: 'array', items: { type: 'string' }, minItems: 1 },
          ttlExpiresAt: { type: 'string', format: 'date-time' },
        },
      },
      BilateralPackage: {
        type: 'object',
        required: ['id', 'packageHash', 'expiresAt', 'createdAt', 'fieldCount', 'expired'],
        properties: {
          id: { type: 'string' },
          packageHash: { type: 'string' },
          expiresAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          fieldCount: { type: 'integer' },
          expired: { type: 'boolean' },
        },
      },
      BilateralAuditDto: {
        type: 'object',
        required: ['id', 'action', 'fieldHash', 'recordCount', 'createdAt'],
        properties: {
          id: { type: 'string' },
          action: { type: 'string' },
          fieldHash: { type: 'string' },
          recordCount: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApprovalRecord: {
        type: 'object',
        required: [
          'id',
          'tenantId',
          'module',
          'actionType',
          'payload',
          'status',
          'requestedBy',
          'resolvedBy',
          'createdAt',
          'resolvedAt',
        ],
        properties: {
          id: { type: 'string' },
          tenantId: { type: 'string' },
          module: { type: 'string' },
          actionType: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
          status: { type: 'string' },
          requestedBy: { type: 'string', nullable: true },
          resolvedBy: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      ResolveApprovalRequest: {
        type: 'object',
        required: ['approve'],
        properties: { approve: { type: 'boolean' } },
      },
      SupplierListItem: {
        type: 'object',
        required: ['id', 'name', 'website', 'status', 'autoSyncEnabled', 'supplierType', 'createdAt'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          website: { type: 'string' },
          status: { type: 'string' },
          autoSyncEnabled: { type: 'boolean' },
          supplierType: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SupplierOverviewRow: {
        type: 'object',
        required: [
          'id',
          'name',
          'website',
          'supplierType',
          'status',
          'autoSyncEnabled',
          'productCount',
          'lastSyncAt',
          'lastAutoSyncAt',
          'recentChangeCount',
          'hasRecentPriceDrop',
          'hasRecentStockChange',
          'hasRecentImportantChange',
          'monitoringLabel',
        ],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          website: { type: 'string' },
          supplierType: { type: 'string' },
          status: { type: 'string' },
          autoSyncEnabled: { type: 'boolean' },
          productCount: { type: 'integer' },
          lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
          lastAutoSyncAt: { type: 'string', format: 'date-time', nullable: true },
          recentChangeCount: { type: 'integer' },
          hasRecentPriceDrop: { type: 'boolean' },
          hasRecentStockChange: { type: 'boolean' },
          hasRecentImportantChange: { type: 'boolean' },
          monitoringLabel: { type: 'string', enum: ['active', 'sync_on', 'disabled'] },
        },
      },
      SupplierOverviewResponse: {
        type: 'object',
        required: ['stats', 'suppliers'],
        properties: {
          stats: {
            type: 'object',
            required: [
              'totalMonitored',
              'activeAutoSyncs',
              'syncsCompletedThisMonth',
              'priceDropsThisMonth',
              'autonomousPriceAdjustments',
            ],
            properties: {
              totalMonitored: { type: 'integer' },
              activeAutoSyncs: { type: 'integer' },
              syncsCompletedThisMonth: { type: 'integer' },
              priceDropsThisMonth: { type: 'integer' },
              autonomousPriceAdjustments: { type: 'integer' },
            },
          },
          suppliers: { type: 'array', items: ref('SupplierOverviewRow') },
        },
      },
      SupplierDetail: {
        type: 'object',
        additionalProperties: true,
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          website: { type: 'string' },
          supplierType: { type: 'string' },
          status: { type: 'string' },
          autoSyncEnabled: { type: 'boolean' },
          recentChanges: { type: 'array', items: { type: 'object', additionalProperties: true } },
          recentProducts: { type: 'array', items: { type: 'object', additionalProperties: true } },
          recentSyncs: { type: 'array', items: { type: 'object', additionalProperties: true } },
        },
      },
    },
  };

  const authErr = { '401': err('Unauthorized'), '400': err('Bad request') };

  patchOp(doc, '/emails', 'get', {
    responses: { '200': ok({ type: 'array', items: ref('EmailMessage') }), ...authErr },
  });
  patchOp(doc, '/emails/process', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ProcessEmailRequest')) },
    responses: {
      '201': ok(ref('EmailMessage'), 'Created'),
      '400': ok({ type: 'object', properties: { error: { type: 'string' } } }, 'Bad request'),
      '401': err('Unauthorized'),
    },
  });
  patchOp(doc, '/emails/metrics', 'get', {
    parameters: [{ name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }],
    responses: { '200': ok(ref('EmailMetrics')), ...authErr },
  });
  patchOp(doc, '/emails/{id}', 'get', {
    responses: {
      '200': ok(ref('EmailMessage')),
      '404': ok({ type: 'object', properties: { error: { type: 'string' } } }, 'Not found'),
      ...authErr,
    },
  });

  patchOp(doc, '/bilateral/schemas', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['schemas'],
        properties: { schemas: { type: 'array', items: ref('BilateralSchema') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/bilateral/contracts', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['contracts'],
        properties: { contracts: { type: 'array', items: ref('BilateralContract') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/bilateral/contracts', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ProposeContractRequest')) },
    responses: {
      '201': ok(ref('BilateralContract'), 'Created'),
      ...authErr,
    },
  });
  patchOp(doc, '/bilateral/contracts/{id}', 'get', {
    responses: { '200': ok(ref('BilateralContract')), ...authErr },
  });
  patchOp(doc, '/bilateral/contracts/{id}/accept', 'post', {
    responses: { '200': ok(ref('BilateralContract')), ...authErr },
  });
  patchOp(doc, '/bilateral/contracts/{id}/revoke', 'post', {
    responses: { '204': { description: 'Revoked' }, ...authErr },
  });
  patchOp(doc, '/bilateral/contracts/{id}/packages', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['packages'],
        properties: { packages: { type: 'array', items: ref('BilateralPackage') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/bilateral/contracts/{id}/audit', 'get', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['audit'],
        properties: { audit: { type: 'array', items: ref('BilateralAuditDto') } },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/bilateral/packages', 'post', {
    requestBody: {
      required: true,
      ...jsonContent({
        type: 'object',
        required: ['contractId'],
        properties: { contractId: { type: 'string' } },
      }),
    },
    responses: { '201': ok(ref('BilateralPackage'), 'Created'), ...authErr },
  });
  patchOp(doc, '/bilateral/packages/consume', 'post', {
    requestBody: {
      required: true,
      ...jsonContent({
        type: 'object',
        required: ['packageId'],
        properties: { packageId: { type: 'string' } },
      }),
    },
    responses: {
      '200': ok({
        type: 'object',
        required: ['packageId', 'fields'],
        properties: {
          packageId: { type: 'string' },
          fields: { type: 'array', items: { type: 'string' } },
        },
      }),
      ...authErr,
    },
  });

  patchOp(doc, '/approvals', 'get', {
    responses: { '200': ok({ type: 'array', items: ref('ApprovalRecord') }), ...authErr },
  });
  patchOp(doc, '/approvals/auto-apply', 'post', {
    responses: {
      '200': ok({
        type: 'object',
        required: ['applied', 'skipped', 'skippedIds'],
        properties: {
          applied: { type: 'integer' },
          skipped: { type: 'integer' },
          skippedIds: { type: 'array', items: { type: 'string' } },
        },
      }),
      ...authErr,
    },
  });
  patchOp(doc, '/approvals/{id}/resolve', 'post', {
    requestBody: { required: true, ...jsonContent(ref('ResolveApprovalRequest')) },
    responses: {
      '200': ok({
        type: 'object',
        required: ['success'],
        properties: { success: { type: 'boolean', enum: [true] } },
      }),
      ...authErr,
    },
  });

  patchOp(doc, '/suppliers', 'get', {
    responses: { '200': ok({ type: 'array', items: ref('SupplierListItem') }), ...authErr },
  });
  patchOp(doc, '/suppliers/overview', 'get', {
    responses: { '200': ok(ref('SupplierOverviewResponse')), ...authErr },
  });
  patchOp(doc, '/suppliers/{id}', 'get', {
    responses: {
      '200': ok(ref('SupplierDetail')),
      '404': ok({ type: 'object', properties: { error: { type: 'string' } } }, 'Not found'),
      ...authErr,
    },
  });

  save('platform.yaml', doc);
}

enrichCommerce();
enrichAdmin();
enrichPlatform();
