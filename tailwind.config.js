/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                "primary": "#4F80FF",
                "primary-dark": "#3563E9",
                "background-light": "#F0F4FF",
                "background-dark": "#0A0E1A",
                "surface-light": "#FFFFFF",
                "surface-dark": "#131929",
                "card-dark": "#1A2035",
                "text-main": "#0F172A",
                "text-muted": "#64748B",
                "success": "#10B981",
                "warning": "#F59E0B",
                "danger": "#EF4444",
            },
            fontFamily: {
                "display": ["Lexend", "sans-serif"],
                "sans": ["Lexend", "sans-serif"],
            },
            borderRadius: {
                "DEFAULT": "0.375rem",
                "lg": "0.625rem",
                "xl": "0.875rem",
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
                "full": "9999px",
            },
            boxShadow: {
                "card": "0 2px 12px rgba(15,23,42,0.06)",
                "card-lg": "0 8px 32px rgba(15,23,42,0.10)",
                "float": "0 16px 48px rgba(15,23,42,0.15)",
                "glow-primary": "0 8px 24px rgba(79,128,255,0.35)",
                "glow-primary-lg": "0 16px 40px rgba(79,128,255,0.4)",
                "glow-success": "0 6px 20px rgba(16,185,129,0.3)",
                "glow-warning": "0 6px 20px rgba(245,158,11,0.3)",
            },
            backgroundImage: {
                "gradient-primary": "linear-gradient(135deg, #4F80FF 0%, #6366F1 60%, #8B5CF6 100%)",
                "gradient-warm": "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
                "gradient-success": "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                "gradient-card": "linear-gradient(160deg, rgba(79,128,255,0.08) 0%, rgba(99,102,241,0.04) 100%)",
            },
            animation: {
                "fade-up": "fade-up 0.5s ease forwards",
                "scale-in": "scale-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
                "float": "float 4s ease-in-out infinite",
                "slide-up": "slide-up 0.4s ease forwards",
                "shimmer": "shimmer 2s linear infinite",
                "pulse-ring": "pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
            },
            keyframes: {
                "fade-up": {
                    from: { opacity: "0", transform: "translateY(12px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "scale-in": {
                    from: { opacity: "0", transform: "scale(0.94)" },
                    to: { opacity: "1", transform: "scale(1)" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-6px)" },
                },
                "slide-up": {
                    from: { opacity: "0", transform: "translateY(20px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% center" },
                    "100%": { backgroundPosition: "200% center" },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
