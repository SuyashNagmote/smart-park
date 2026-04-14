import { defineConfig, presetIcons, presetUno, presetWebFonts } from 'unocss';

export default defineConfig({
	shortcuts: [
		{
			'glass-panel':
				'bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] rounded-2xl',
			'glass-button':
				'bg-blue-500/80 hover:bg-blue-400/90 text-white backdrop-blur-md transition-all duration-300 rounded-xl font-medium shadow-[0_4px_15px_rgba(59,130,246,0.4)]',
			'text-gradient':
				'bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400',
			'futuristic-border': 'border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]',
			// Refined "Duolingo-ish" primitives (theme via CSS variables in app.css)
			'sp-shell': 'mx-auto max-w-6xl px-5 sm:px-6',
			'sp-topbar': 'sp-glass rounded-2xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3',
			'sp-pill': 'sp-btn px-3 py-2 text-sm font-semibold',
			'sp-tab': 'sp-btn px-4 py-2.5 text-sm font-bold',
			'sp-kpi': 'sp-card px-4 py-3',
			'sp-section': 'sp-card p-5 sm:p-6',
		},
	],
	presets: [
		presetUno(),
		presetIcons({
			extraProperties: {
				display: 'inline-block',
				'vertical-align': 'middle',
			},
		}),
		presetWebFonts({
			fonts: {
				sans: 'Inter:300,400,500,600,700',
				display: 'Outfit:400,600,800',
			},
		}),
	],
	theme: {
		colors: {
			uberBlack: '#000000',
			darkSurface: '#0B0F19',
			neonBlue: '#00E5FF',
			neonPurple: '#B14CFF',
		},
	},
});
