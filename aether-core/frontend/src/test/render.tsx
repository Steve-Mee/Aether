import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { createElement, type ReactElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CommandProvider } from '@/lib/CommandContext';
import { DashboardProvider } from '@/lib/DashboardContext';
import { MerchantSettingsProvider } from '@/lib/settings/MerchantSettingsContext';
import QueryInvalidationBridge from '@/lib/query/QueryInvalidationBridge';
import { NotificationProvider } from '@/lib/notifications/NotificationContext';
import { setDataAdapterForTests } from '@/lib/data/createDataAdapter';
import type { DataAdapter } from '@/lib/data/adapters/DataAdapter';
import { createTestDataAdapter } from './createTestDataAdapter';

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export interface ProviderOptions {
  initialEntries?: string[];
  adapter?: DataAdapter;
  withCommand?: boolean;
}

export interface CriticalFlowOptions extends ProviderOptions {
  /** Include CommandProvider (default true). */
  withCommand?: boolean;
}

function AllProviders({
  children,
  queryClient,
  options,
}: {
  children: ReactNode;
  queryClient: QueryClient;
  options: ProviderOptions;
}) {
  const adapter = options.adapter ?? createTestDataAdapter();
  setDataAdapterForTests(adapter);

  let tree: ReactNode = children;
  if (options.withCommand) {
    tree = createElement(CommandProvider, null, tree);
  }

  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(
      MemoryRouter,
      { initialEntries: options.initialEntries ?? ['/approvals'] },
      createElement(MerchantSettingsProvider, null, createElement(DashboardProvider, null, tree)),
    ),
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, 'wrapper'> = {},
) {
  const queryClient = createTestQueryClient();
  const { initialEntries, adapter, withCommand, ...renderOptions } = options;

  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) =>
        createElement(AllProviders, {
          children,
          queryClient,
          options: { initialEntries, adapter, withCommand },
        }),
      ...renderOptions,
    }),
  };
}

export function createHookWrapper(options: ProviderOptions = {}) {
  const queryClient = createTestQueryClient();
  const adapter = options.adapter ?? createTestDataAdapter();
  setDataAdapterForTests(adapter);

  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = children;
    if (options.withCommand) {
      tree = createElement(CommandProvider, null, tree);
    }

    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: options.initialEntries ?? ['/approvals'] },
        createElement(DashboardProvider, null, tree),
      ),
    );
  }

  return { Wrapper, queryClient };
}

/**
 * Full provider stack for cross-screen integration tests:
 * QueryClient → MemoryRouter → QueryInvalidationBridge → MerchantSettingsProvider
 * → NotificationProvider → DashboardProvider → CommandProvider (optional).
 */
export function createCriticalFlowWrapper(options: CriticalFlowOptions = {}) {
  const queryClient = createTestQueryClient();
  const adapter = options.adapter ?? createTestDataAdapter();
  setDataAdapterForTests(adapter);
  const withCommand = options.withCommand !== false;

  function Wrapper({ children }: { children: ReactNode }) {
    let tree: ReactNode = children;
    if (withCommand) {
      tree = createElement(CommandProvider, null, tree);
    }
    tree = createElement(DashboardProvider, null, tree);
    tree = createElement(NotificationProvider, null, tree);
    tree = createElement(MerchantSettingsProvider, null, tree);

    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: options.initialEntries ?? ['/approvals'] },
        createElement(QueryInvalidationBridge),
        tree,
      ),
    );
  }

  return { Wrapper, queryClient };
}

export { createTestQueryClient };
