<script lang="ts">
	import { onMount } from 'svelte';

	let {
		durationMs = 2400,
		intensity = 1.6,
		bursts = 3,
		mode = 'shower',
		fullScreen = true,
	}: {
		durationMs?: number;
		intensity?: number;
		bursts?: number;
		mode?: 'burst' | 'shower';
		fullScreen?: boolean;
	} = $props();

	let canvas: HTMLCanvasElement = $state() as any;

	type P = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		r: number;
		w: number;
		h: number;
		spin: number;
		angle: number;
		color: string;
	};

	const palette = ['#22c55e', '#16a34a', '#38bdf8', '#fbbf24', '#a78bfa', '#fb7185'];

	onMount(() => {
		// Respect reduced motion: keep it brief + lighter.
		const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
		const finalIntensity = reduce ? Math.min(0.7, intensity) : intensity;
		const finalBursts = reduce ? 1 : Math.max(1, Math.round(bursts));
		const finalDuration = reduce ? Math.min(900, durationMs) : durationMs;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let rect = { width: 0, height: 0 };
		let dpr = 1;

		const measure = () => {
			const parent = canvas.parentElement as HTMLElement | null;
			const r = (parent ?? canvas).getBoundingClientRect();
			rect = { width: Math.max(1, r.width), height: Math.max(1, r.height) };
			dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.floor(rect.width * dpr);
			canvas.height = Math.floor(rect.height * dpr);
			canvas.style.width = `${rect.width}px`;
			canvas.style.height = `${rect.height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};

		measure();
		const ro = new ResizeObserver(() => measure());
		if (canvas.parentElement) ro.observe(canvas.parentElement);

		const w = () => rect.width;
		const h = () => rect.height;

		const parts: P[] = [];

		const spawnBurst = (seed: number, centerX: number, centerY: number) => {
			// More pieces, bigger, with 3 “waves” (bursts).
			const baseN = Math.round(140 * Math.min(1.2, w() / 900) * finalIntensity);
			const n = Math.max(90, baseN);
			for (let i = 0; i < n; i++) {
				const side = i % 2 === 0 ? -1 : 1;
				const x = centerX + side * (w() * (0.06 + Math.random() * 0.1));
				const y = centerY + (Math.random() - 0.5) * (h() * 0.12);
				const speed = (8 + Math.random() * 9) * (0.9 + finalIntensity * 0.25);
				const a = (Math.random() * Math.PI) / 2 + (side === -1 ? 0 : Math.PI / 2);
				const vx = Math.cos(a) * speed * side;
				const vy = -Math.sin(a) * speed - (10 + Math.random() * 9);
				parts.push({
					x,
					y,
					vx,
					vy,
					r: 0.92 + Math.random() * 0.25,
					w: 7 + Math.random() * 10,
					h: 12 + Math.random() * 16,
					spin: (Math.random() - 0.5) * 0.38,
					angle: Math.random() * Math.PI,
					color: palette[(i + seed) % palette.length],
				});
			}
		};

		const spawnShower = (seed: number, count: number) => {
			for (let i = 0; i < count; i++) {
				const x = Math.random() * w();
				const y = -20 - Math.random() * 120;
				const vy = 2.2 + Math.random() * (3.4 + finalIntensity * 0.9);
				const vx = (Math.random() - 0.5) * (1.4 + finalIntensity * 0.9);
				parts.push({
					x,
					y,
					vx,
					vy,
					r: 0.92 + Math.random() * 0.25,
					w: 6 + Math.random() * 8,
					h: 10 + Math.random() * 13,
					spin: (Math.random() - 0.5) * 0.26,
					angle: Math.random() * Math.PI,
					color: palette[(i + seed) % palette.length],
				});
			}
		};

		if (mode === 'burst') {
			const cx = w() * 0.5;
			const cy = h() * 0.52;
			spawnBurst(0, cx, cy);
			for (let b = 1; b < finalBursts; b++) {
				setTimeout(() => spawnBurst(b, cx + (Math.random() - 0.5) * 40, cy + (Math.random() - 0.5) * 30), 180 * b);
			}
		} else {
			const base = Math.round(140 * Math.min(1.15, w() / 900) * finalIntensity);
			const wave = Math.max(90, base);
			spawnShower(0, wave);
			// light “stream” for a short window
			const streamMs = Math.min(1000, Math.max(520, Math.round(720 * Math.min(2, finalIntensity))));
			const startedAt = performance.now();
			const stream = () => {
				if (performance.now() - startedAt > streamMs) return;
				spawnShower(1, Math.max(14, Math.round(18 * Math.min(2.3, finalIntensity))));
				setTimeout(stream, 90);
			};
			setTimeout(stream, 90);
		}

		const g = mode === 'shower' ? 0.14 : 0.36;
		const air = mode === 'shower' ? 0.996 : 0.993;
		const start = performance.now();
		let raf = 0;

		const tick = (now: number) => {
			const t = now - start;
			ctx.clearRect(0, 0, w(), h());

			const fade = Math.max(0, Math.min(1, (finalDuration - t) / 420));
			ctx.globalAlpha = Math.min(1, 0.98 * (t / 90)) * Math.min(1, 0.96 * fade);

			for (const p of parts) {
				p.vx *= air;
				p.vy = p.vy * air + g;
				p.x += p.vx;
				p.y += p.vy;
				p.angle += p.spin;

				// little flutter
				p.vx += Math.sin((p.y + p.x) * 0.01) * (mode === 'shower' ? 0.03 : 0.05);
				p.vy += Math.cos((p.y - p.x) * 0.008) * (mode === 'shower' ? 0.008 : 0.015);

				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.angle);
				ctx.fillStyle = p.color;
				ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
				ctx.restore();
			}

			if (t < finalDuration) raf = requestAnimationFrame(tick);
		};

		raf = requestAnimationFrame(tick);

		return () => {
			ro.disconnect();
			cancelAnimationFrame(raf);
		};
	});
</script>

<canvas
	bind:this={canvas}
	class={(fullScreen ? 'fixed inset-0 z-[80]' : 'absolute inset-0') + ' w-full h-full pointer-events-none'}
	aria-hidden="true"
></canvas>

