const neutral = { 50: 'hsl(var(--card))', 100: 'hsl(var(--background))', 200: 'hsl(var(--border))', 300: 'hsl(var(--input))', 400: 'hsl(var(--muted-foreground))', 500: 'hsl(var(--muted-foreground))', 600: 'hsl(var(--muted-foreground))', 700: 'hsl(var(--foreground))', 800: 'hsl(var(--foreground))', 900: 'hsl(var(--primary))', 950: 'hsl(var(--primary))' };
const tone = name => ({ 50: `hsl(var(--${name}-soft) / <alpha-value>)`, 100: `hsl(var(--${name}-soft) / <alpha-value>)`, 200: `hsl(var(--${name}-border) / <alpha-value>)`, 300: `hsl(var(--${name}-border) / <alpha-value>)`, 400: `hsl(var(--${name}) / <alpha-value>)`, 500: `hsl(var(--${name}) / <alpha-value>)`, 600: `hsl(var(--${name}) / <alpha-value>)`, 700: `hsl(var(--${name}-ink) / <alpha-value>)`, 800: `hsl(var(--${name}-ink) / <alpha-value>)`, 900: `hsl(var(--${name}-ink) / <alpha-value>)`, 950: `hsl(var(--${name}-ink) / <alpha-value>)` });

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
      fontFamily: { heading: ['var(--font-heading)'], body: ['var(--font-body)'], display: ['var(--font-display)'] },
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
        gray: neutral, slate: neutral, zinc: neutral,
        red: tone('danger'), rose: tone('danger'),
        yellow: tone('warning'), amber: tone('warning'), orange: tone('warning'),
        green: tone('success'), emerald: tone('success'),
        blue: tone('info'), indigo: tone('info'), cyan: tone('info'),
        purple: tone('review'), violet: tone('review'), pink: tone('review'),
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}