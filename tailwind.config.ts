/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        vault: {
          50: 'hsl(220, 100%, 97%)',
          100: 'hsl(220, 95%, 94%)',
          200: 'hsl(220, 90%, 87%)',
          300: 'hsl(220, 85%, 76%)',
          400: 'hsl(220, 80%, 62%)',
          500: 'hsl(220, 75%, 52%)',
          600: 'hsl(220, 72%, 44%)',
          700: 'hsl(220, 70%, 36%)',
          800: 'hsl(220, 68%, 28%)',
          900: 'hsl(220, 65%, 20%)',
          950: 'hsl(220, 60%, 13%)',
        },
        success: { DEFAULT: 'hsl(142, 71%, 45%)', foreground: 'hsl(0, 0%, 100%)' },
        warning: { DEFAULT: 'hsl(38, 92%, 50%)', foreground: 'hsl(0, 0%, 100%)' },
        danger: { DEFAULT: 'hsl(0, 84%, 60%)', foreground: 'hsl(0, 0%, 100%)' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        pulse: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.5' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        shimmer: 'shimmer 2s linear infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-sm': '0 0 10px -2px hsl(var(--primary) / 0.3)',
        'glow-md': '0 0 20px -4px hsl(var(--primary) / 0.4)',
        'glow-lg': '0 0 40px -8px hsl(var(--primary) / 0.5)',
        glass: 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
