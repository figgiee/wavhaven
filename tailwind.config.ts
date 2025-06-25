import type { Config } from "tailwindcss";
// Import default theme for extending
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Conceptual palette based on PRD Phase 1, to be refined with Phase 2 design system.
        // These are conceptual names; actual theming might use CSS variables via Shadcn/ui.
        
        // Keep mappings for border, input, ring
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Shadcn UI color mappings
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Map Tailwind neutral colors to our CSS variables
        neutral: {
          50: 'hsl(var(--neutral-50))',
          100: 'hsl(var(--neutral-100))',
          200: 'hsl(var(--neutral-200))',
          300: 'hsl(var(--neutral-300))',
          400: 'hsl(var(--neutral-400))',
          500: 'hsl(var(--neutral-500))',
          600: 'hsl(var(--neutral-600))',
          700: 'hsl(var(--neutral-700))',
          800: 'hsl(var(--neutral-800))',
          900: 'hsl(var(--neutral-900))',
          950: 'hsl(var(--neutral-950))',
        },
        // Custom brand colors
        'cyan-glow': '#00D4FF',
        'abyss-blue': '#030712',
        'magenta-spark': '#FF0080', 
      },
      spacing: {
        '128': '32rem', // Example custom spacing
      },
      borderRadius: {
        'lg': 'var(--radius)',
        'xl': 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        'card': 'var(--radius)', // Consistent card radius
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans], // Ensure Inter is primary
        // heading: ["Satoshi", ...defaultTheme.fontFamily.sans], // Example for a different heading font
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      keyframes: {
        "bg-pan": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
        "shimmer": {
          '0%, 100%': { backgroundPosition: '-200% 0' },
          '50%': { backgroundPosition: '200% 0' },
        },
        "logo-glow": {
          '0%, 100%': { filter: 'drop-shadow(0 0 5px rgba(0, 212, 255, 0.5))' },
          '50%': { filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.8))' },
        },
        "wave-pulse": {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
      animation: {
        "bg-pan": "bg-pan 10s linear infinite alternate",
        "shimmer": 'shimmer 2s infinite linear',
        "logo-glow": 'logo-glow 3s ease-in-out infinite',
        "wave-pulse": 'wave-pulse 2s ease-in-out infinite',
      },
      backgroundImage: {
        "hero-gradient-light": "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--secondary) / 0.1) 50%, hsl(var(--accent) / 0.1))",
        "hero-gradient-dark": "linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--secondary) / 0.1) 50%, hsl(var(--accent) / 0.1))",
      },
      boxShadow: {
        'glow-cyan-sm': '0 0 8px 0px rgba(0, 224, 255, 0.5)',
        'glow-cyan-md': '0 0 15px 2px rgba(0, 224, 255, 0.4)',
        'subtle-lift': '0 4px 15px rgba(0,0,0,0.2)', // For dark theme, shadows are subtle
        'card-hover': '0 8px 25px rgba(0, 224, 255, 0.1)', // Subtle glow on card hover
      },
      dropShadow: {
        'glow-cyan': '0 0 10px rgba(0, 212, 255, 0.7)',
        'glow-cyan-sm': '0 0 5px rgba(0, 212, 255, 0.5)',
        'glow-cyan-lg': '0 0 20px rgba(0, 212, 255, 0.8)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config; 