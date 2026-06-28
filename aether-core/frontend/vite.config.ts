import { defineConfig, loadEnv } from 'vite';

import react from '@vitejs/plugin-react';

import { sentryVitePlugin } from '@sentry/vite-plugin';

import path from 'path';

import { visualizer } from 'rollup-plugin-visualizer';



export default defineConfig(({ mode }) => {

  const analyze = mode === 'analyze';

  const envDir = path.resolve(__dirname, '..');

  const env = loadEnv(mode, envDir, '');

  const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

  const sentryOrg = process.env.SENTRY_ORG;

  const sentryProject = process.env.SENTRY_PROJECT;

  const sentryDsn = env.VITE_SENTRY_DSN;

  const appVersion = env.VITE_APP_VERSION ?? process.env.VITE_APP_VERSION;

  const sentryUploadEnabled = Boolean(

    sentryAuthToken && sentryOrg && sentryProject && sentryDsn && appVersion

  );



  return {

    plugins: [

      react(),

      sentryUploadEnabled &&

        sentryVitePlugin({

          org: sentryOrg!,

          project: sentryProject!,

          authToken: sentryAuthToken!,

          release: { name: appVersion! },

          sourcemaps: {

            assets: './dist/**',

          },

        }),

      analyze &&

        visualizer({

          filename: 'stats.html',

          open: false,

          gzipSize: true,

          brotliSize: true,

        }),

    ].filter(Boolean),

    resolve: {

      alias: {

        '@': path.resolve(__dirname, './src'),

      },

    },

    envDir,

    build: {

      target: 'es2020',

      minify: 'esbuild',

      cssMinify: true,

      sourcemap: 'hidden',

      chunkSizeWarningLimit: 500,

      rollupOptions: {

        output: {

          manualChunks: {

            vendor: ['react', 'react-dom', 'react-router-dom'],

            query: ['@tanstack/react-query'],

            radix: [

              '@radix-ui/react-dialog',

              '@radix-ui/react-popover',

              '@radix-ui/react-slot',

            ],

          },

        },

      },

    },

    test: {

      environment: 'jsdom',

      setupFiles: ['./src/test/setup.ts'],

      include: [

        'src/**/*.test.ts',

        'src/**/*.test.tsx',

        'src/**/*.integration.test.ts',

        'src/**/*.integration.test.tsx',

      ],

      exclude: ['e2e/**', 'node_modules/**'],

      coverage: {

        provider: 'v8',

        reporter: ['text', 'text-summary'],

        include: ['src/lib/**', 'src/features/**/hooks/**', 'src/hooks/**'],

        exclude: ['src/**/*.test.*', 'src/test/**'],

      },

    },

    server: {

      port: 5173,

      proxy: {

        '/api': {

          target: 'http://localhost:9000',

          changeOrigin: true,

        },

      },

    },

  };

});


