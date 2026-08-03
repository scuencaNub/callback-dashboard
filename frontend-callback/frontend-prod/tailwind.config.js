/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Amazon Ember"', 'Helvetica', 'system-ui', 'sans-serif'],
                display: ['"Amazon Ember Display"', '"Amazon Ember"', 'Helvetica', 'system-ui', 'sans-serif'],
                mono: ['"Amazon Ember Mono"', 'Monaco', 'Consolas', 'monospace'],
            },
            fontWeight: {
                thin: '100',
                light: '300',
                normal: '400',
                medium: '500',
                semibold: '600',
                bold: '700',
                extrabold: '800',
                black: '900',
            },
            fontSize: {
                // Amazon Typography Scale
                'display-1': ['2.5rem', { lineHeight: '1.2' }],
                'display-2': ['2rem', { lineHeight: '1.25' }],
                'display-3': ['1.75rem', { lineHeight: '1.3' }],
                'display-4': ['1.5rem', { lineHeight: '1.35' }],
                'display-5': ['1.25rem', { lineHeight: '1.4' }],
                'display-6': ['1.125rem', { lineHeight: '1.45' }],
                'body': ['1rem', { lineHeight: '1.5' }],
                'callout': ['0.875rem', { lineHeight: '1.55' }],
                'metadata': ['0.75rem', { lineHeight: '1.6' }],
                'caption': ['0.75rem', { lineHeight: '1.6' }],
            },
            colors: {
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
                },
                // Amazon Connect specific colors
                connect: {
                    primary: 'hsl(var(--connect-primary))',
                    'primary-hover': 'hsl(var(--connect-primary-hover))',
                    'primary-active': 'hsl(var(--connect-primary-active))',
                    secondary: 'hsl(var(--connect-secondary))',
                    accent: 'hsl(var(--connect-accent))',
                    border: 'hsl(var(--connect-border))',
                    text: 'hsl(var(--connect-text))',
                    'text-muted': 'hsl(var(--connect-text-muted))'
                },
                // AWS/Amazon Connect brand colors
                aws: {
                    blue: '#077398',
                    'blue-dark': '#065B78',
                    'blue-darker': '#004A9E',
                    orange: '#FF9900',
                    gray: {
                        50: '#F2FAFC',
                        100: '#E5F3F8',
                        200: '#CCE7F1',
                        300: '#B3DBEA',
                        400: '#99CFE3',
                        500: '#80C3DC',
                        600: '#66B7D5',
                        700: '#4DABCE',
                        800: '#339FC7',
                        900: '#1A93C0'
                    }
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
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
