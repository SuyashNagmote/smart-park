<script lang="ts">
	import 'virtual:uno.css';
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';
	import gsap from 'gsap';
	import { initOfflineSync } from '$lib/client/state';

	let { children }: { children: Snippet } = $props();

	let theme = $state<'light' | 'dark'>('dark');

	function applyTheme(next: 'light' | 'dark') {
		theme = next;
		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = next;
		}
		try {
			localStorage.setItem('sp_theme', next);
		} catch {
			// ignore
		}
	}

	onMount(() => {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem('sp_theme');
		} catch {
			// ignore
		}

		if (saved === 'light' || saved === 'dark') {
			applyTheme(saved);
			return;
		}

		const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
		applyTheme(prefersDark ? 'dark' : 'light');

		initOfflineSync();
	});

	afterNavigate(() => {
		// Intentional, lightweight page entrance motion (no overdo; respects reduced motion via media query)
		if (typeof window === 'undefined') return;
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
		const el = document.querySelector('[data-page]');
		if (!el) return;
		gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
	});
</script>

<main class="min-h-screen">
	<div class="fixed inset-0 -z-10 pointer-events-none">
		<div class="absolute inset-0 opacity-80"></div>
	</div>

	<div class="fixed right-3 top-3 z-50 sm:bottom-5 sm:right-5 sm:top-auto">
		<button
			type="button"
			class="sp-btn sp-glass px-3 py-2 text-xs font-semibold sm:px-4 sm:py-2.5 sm:text-sm"
			onclick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
			aria-label="Toggle theme"
			title="Toggle theme"
		>
			<span class="i-bx-bulb inline-block mr-1.5 align-middle sm:mr-2"></span>
			{theme === 'dark' ? 'Light' : 'Dark'}
		</button>
	</div>

	<div data-page class="min-h-screen">
		{@render children()}
	</div>
</main>
