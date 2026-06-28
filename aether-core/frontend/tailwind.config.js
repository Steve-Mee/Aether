import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'aether-purple': '#7C3AED',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          readable: 'hsl(var(--primary-readable))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      spacing: {
        'aether-1': 'var(--space-1)',
        'aether-2': 'var(--space-2)',
        'aether-3': 'var(--space-3)',
        'aether-4': 'var(--space-4)',
        'aether-5': 'var(--space-5)',
        'aether-6': 'var(--space-6)',
        'aether-8': 'var(--space-8)',
        'aether-10': 'var(--space-10)',
        'aether-12': 'var(--space-12)',
      },
      fontSize: {
        display: ['var(--text-display)', { lineHeight: 'var(--leading-tight)' }],
        headline: ['var(--text-headline)', { lineHeight: 'var(--leading-snug)' }],
        title: ['var(--text-title)', { lineHeight: 'var(--leading-snug)' }],
        body: ['var(--text-body)', { lineHeight: 'var(--leading-normal)' }],
        meta: ['var(--text-meta)', { lineHeight: 'var(--leading-normal)' }],
        caption: ['var(--text-caption)', { lineHeight: 'var(--leading-normal)' }],
      },
      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
      },
      boxShadow: {
        insight: 'var(--shadow-insight)',
        elevated: 'var(--shadow-elevated)',
        'glow-focus': 'var(--shadow-glow-focus)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      borderRadius: {
        aether: 'var(--radius-xl)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'highlight-pulse': {
          '0%': { boxShadow: '0 0 0 2px hsl(var(--primary) / 0)' },
          '40%': { boxShadow: '0 0 0 2px hsl(var(--primary) / 0.30), var(--shadow-glow-focus)' },
          '100%': { boxShadow: '0 0 0 2px hsl(var(--primary) / 0.18), var(--shadow-glow-focus)' },
        },
        'card-enter': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'card-exit': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(-4px)' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'highlight-pulse': 'highlight-pulse 2s ease-out',
        'card-enter': 'card-enter 0.4s ease-out',
        'card-exit': 'card-exit 0.35s ease-in forwards',
        'skeleton-shimmer': 'skeleton-shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
