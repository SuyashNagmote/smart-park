import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import unocss from 'unocss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	plugins: [
		unocss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'Smart Park',
				short_name: 'SmartPark',
				description: 'Parking map, bookings, sessions, and EV charging.',
				theme_color: '#16a34a',
				background_color: '#070b12',
				display: 'standalone',
				start_url: '/',
				icons: [
					{
						src: '/favicon.svg',
						sizes: 'any',
						type: 'image/svg+xml',
					},
				],
			},
			workbox: {
				navigateFallback: '/',
				runtimeCaching: [
					{
						urlPattern: ({ url }) => url.pathname.startsWith('/api/lots'),
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'api-lots',
							expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
						},
					},
				],
			},
		}),
	],
});
