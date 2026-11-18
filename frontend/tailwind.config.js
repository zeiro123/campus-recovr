import flowbiteReact from "flowbite-react/plugin/tailwindcss";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    ".flowbite-react/class-list.json"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // ── University of Zimbabwe palette (dark navy + UZ orange) ──
        canvas: '#0b1424',                       // page background (deep navy)
        card: '#152743',                         // solid panel fill (assistant, chat)
        surface: {                               // panels / cards
          DEFAULT: '#111e33',
          2: '#16263f',                          // inputs, inset areas
          3: '#1c304e',                          // raised / hover fill
          4: '#243a5c',                          // strongest fill
        },
        line: {                                  // hairline borders
          DEFAULT: 'rgba(148,180,255,0.09)',
          strong: 'rgba(148,180,255,0.18)',
        },
        ink: {                                   // text ramp (all ≥4.5:1 on canvas/surface)
          DEFAULT: '#f4f6fb',
          dim: '#b6c2d9',
          mute: '#8d9cb8',
        },
        accent: {
          DEFAULT: '#F87D0D',                    // UZ orange (top nav bar)
          soft: '#F0A030',                       // UZ amber stripe
          strong: '#E06F00',
          deep: '#C25E00',
          ink: '#2b1602',                        // text on accent fills
        },
        'accent2': {
          DEFAULT: '#1E56A0',                    // UZ royal blue bands
          soft: '#3F6FC1',                       // UZ nav-link blue
        },
        ok: '#34d399',
        warn: '#fbbf24',
        bad: '#fb7185',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 32px -18px rgba(0,0,0,0.9)',
        pop: '0 24px 48px -20px rgba(0,0,0,0.85)',
        glow: '0 10px 30px -12px rgba(248,125,13,0.45)',
        ring: '0 0 0 1px rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-up': 'fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [flowbiteReact],
}
