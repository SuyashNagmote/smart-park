<script lang="ts">
	import { onMount } from 'svelte';

	let {
		open = false,
		onClose,
		onWin,
	}: {
		open?: boolean;
		onClose: () => void;
		onWin: (result: { score: number; timeMs: number }) => void;
	} = $props();

	type Phase = 'reveal' | 'menu' | 'levels' | 'ready' | 'play' | 'paused' | 'win' | 'lose';
	let phase = $state<Phase>('reveal');
	let canvas: HTMLCanvasElement = $state() as any;
	let raf = 0;
	let startedAt = $state<number>(0);
	let timeMs = $state<number>(0);
	let bestMs = $state<number | null>(null);
	let failReason = $state<string>('');
	let level = $state(1);
	let score = $state(0);
	let timeLeftMs = $state(60_000);
	let collisionPenaltyCooldownMs = $state(0);

	// input
	let left = false;
	let right = false;
	let accel = false;
	let reverse = false;
	let brake = false;

	// touch joystick (very simple)
	let joyActive = $state(false);
	let joyX = $state(0); // -1..1
	let joyY = $state(0); // -1..1 (up accel)

	const reduceMotion =
		typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

	function reset() {
		phase = reduceMotion ? 'menu' : 'reveal';
		timeMs = 0;
		startedAt = 0;
		level = 1;
		score = 0;
		timeLeftMs = 60_000;
	}

	onMount(() => {
		reset();
		const onKeyDown = (e: KeyboardEvent) => {
			if (!open) return;
			if (e.key === 'Escape') onClose();
			if (e.key === 'Escape' && phase === 'play') {
				phase = 'paused';
				return;
			}
			if (e.key === 'Escape' && phase === 'paused') {
				phase = 'play';
				return;
			}
			if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') left = true;
			if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') right = true;
			if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') accel = true;
			if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') reverse = true;
			if (e.key === ' ') brake = true;
			if (e.key === 'Enter' && phase === 'ready') start();
			if (e.key === 'Enter' && (phase === 'win' || phase === 'lose')) restart();
		};
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') left = false;
			if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') right = false;
			if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') accel = false;
			if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') reverse = false;
			if (e.key === ' ') brake = false;
		};
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			cancelAnimationFrame(raf);
		};
	});

	// tiny physics world (in "meters")
	type Car = { x: number; y: number; a: number; v: number };
	let car = $state<Car>({ x: 3.2, y: 7.8, a: -Math.PI / 2, v: 0 });
	let parkHoldMs = $state(0);
	const HOLD_TO_WIN_MS = 5000;

	const world = {
		w: 10,
		h: 10,
	};

	const obstacles = [
		{ x: 4.6, y: 4.2, r: 0.28 },
		{ x: 5.2, y: 6.1, r: 0.28 },
		{ x: 6.1, y: 5.0, r: 0.28 },
		{ x: 7.7, y: 6.6, r: 0.28 },
	];

	const spot = {
		x: 7.2,
		y: 2.3,
		w: 1.4,
		h: 2.2,
		a: -Math.PI / 2,
	};

	type LevelSpec = {
		id: number;
		timeMs: number;
		spot: typeof spot;
		obstacles: { x: number; y: number; r: number; vx?: number; vy?: number }[];
		start: { x: number; y: number; a: number };
	};
	const levels: LevelSpec[] = [
		{
			id: 1,
			timeMs: 60_000,
			start: { x: 3.0, y: 7.9, a: -Math.PI / 2 },
			spot: { x: 7.3, y: 2.6, w: 1.65, h: 2.45, a: -Math.PI / 2 },
			obstacles: [
				{ x: 4.6, y: 4.2, r: 0.28, vx: 0.0, vy: 0.22 },
				{ x: 5.2, y: 6.1, r: 0.28 },
			],
		},
		{
			id: 2,
			timeMs: 55_000,
			start: { x: 2.6, y: 7.7, a: -Math.PI / 2 },
			spot: { x: 7.6, y: 3.1, w: 1.45, h: 2.25, a: -Math.PI / 2 },
			obstacles: [
				{ x: 4.2, y: 3.7, r: 0.28, vx: 0.18, vy: 0.0 },
				{ x: 5.7, y: 5.2, r: 0.28 },
				{ x: 6.8, y: 6.6, r: 0.28, vx: 0.0, vy: -0.2 },
				{ x: 7.8, y: 4.6, r: 0.28, vx: -0.16, vy: 0.12 },
			],
		},
		{
			id: 3,
			timeMs: 50_000,
			start: { x: 2.2, y: 7.6, a: -Math.PI / 2 },
			spot: { x: 8.0, y: 2.7, w: 1.24, h: 2.02, a: -Math.PI / 2 },
			obstacles: [
				{ x: 4.2, y: 3.2, r: 0.28, vx: 0.16, vy: 0.1 },
				{ x: 5.2, y: 4.9, r: 0.28, vx: 0.0, vy: -0.18 },
				{ x: 6.2, y: 6.2, r: 0.28, vx: -0.22, vy: 0.0 },
				{ x: 7.1, y: 5.0, r: 0.28, vx: 0.18, vy: 0.0 },
				{ x: 6.9, y: 3.9, r: 0.28 },
			],
		},
		{
			id: 4,
			timeMs: 45_000,
			start: { x: 2.0, y: 7.6, a: -Math.PI / 2 },
			spot: { x: 8.2, y: 2.6, w: 1.16, h: 1.92, a: -Math.PI / 2 },
			obstacles: [
				{ x: 4.1, y: 3.4, r: 0.28, vx: 0.26, vy: 0.0 },
				{ x: 5.0, y: 4.8, r: 0.28, vx: 0.0, vy: 0.26 },
				{ x: 6.1, y: 6.0, r: 0.28, vx: -0.26, vy: 0.0 },
				{ x: 7.2, y: 5.2, r: 0.28, vx: 0.18, vy: -0.16 },
				{ x: 6.8, y: 3.9, r: 0.28, vx: -0.18, vy: 0.14 },
				{ x: 5.8, y: 3.6, r: 0.28 },
			],
		},
		{
			id: 5,
			timeMs: 40_000,
			start: { x: 1.9, y: 7.5, a: -Math.PI / 2 },
			spot: { x: 8.35, y: 2.55, w: 1.06, h: 1.82, a: -Math.PI / 2 },
			obstacles: [
				{ x: 4.0, y: 3.2, r: 0.28, vx: 0.30, vy: 0.0 },
				{ x: 4.9, y: 4.9, r: 0.28, vx: 0.0, vy: 0.30 },
				{ x: 6.1, y: 6.2, r: 0.28, vx: -0.30, vy: 0.0 },
				{ x: 7.1, y: 5.0, r: 0.28, vx: 0.22, vy: -0.18 },
				{ x: 6.9, y: 3.8, r: 0.28, vx: -0.22, vy: 0.18 },
				{ x: 5.8, y: 3.4, r: 0.28, vx: 0.18, vy: 0.12 },
				{ x: 7.8, y: 4.1, r: 0.28 },
			],
		},
	];
	let spec = $state<LevelSpec>(levels[0]);

	function start() {
		phase = 'play';
		startedAt = performance.now();
		timeLeftMs = spec.timeMs;
	}

	function restart() {
		car = { x: spec.start.x, y: spec.start.y, a: spec.start.a, v: 0 };
		parkHoldMs = 0;
		failReason = '';
		left = right = accel = reverse = brake = false;
		joyActive = false;
		joyX = joyY = 0;
		phase = 'ready';
		timeMs = 0;
		startedAt = 0;
		timeLeftMs = spec.timeMs;
		collisionPenaltyCooldownMs = 0;
	}

	function clamp(v: number, a: number, b: number) {
		return Math.max(a, Math.min(b, v));
	}

	function fmtHMS(ms: number) {
		const s = Math.max(0, Math.floor(ms / 1000));
		const hh = Math.floor(s / 3600);
		const mm = Math.floor((s % 3600) / 60);
		const ss = s % 60;
		if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
		return `${mm}:${String(ss).padStart(2, '0')}`;
	}

	function inSpot() {
		// Inside the rectangle + roughly aligned + mostly still (slightly forgiving)
		const dx = car.x - spec.spot.x;
		const dy = car.y - spec.spot.y;
		const localX = dx * Math.cos(-spec.spot.a) - dy * Math.sin(-spec.spot.a);
		const localY = dx * Math.sin(-spec.spot.a) + dy * Math.cos(-spec.spot.a);
		const inside = Math.abs(localX) <= spec.spot.w / 2 - 0.06 && Math.abs(localY) <= spec.spot.h / 2 - 0.12;
		const ang = Math.abs(((car.a - spec.spot.a + Math.PI) % (2 * Math.PI)) - Math.PI);
		return inside && ang < 0.45 && Math.abs(car.v) < 0.35;
	}

	function step(dt: number) {
		// countdown timer
		timeLeftMs = Math.max(0, timeLeftMs - dt * 1000);
		if (timeLeftMs <= 0) {
			phase = 'lose';
			failReason = 'Time ran out.';
			return;
		}

		collisionPenaltyCooldownMs = Math.max(0, collisionPenaltyCooldownMs - dt * 1000);
		const applyCollisionPenalty = () => {
			if (collisionPenaltyCooldownMs > 0) return;
			timeLeftMs = Math.max(0, timeLeftMs - 5000);
			collisionPenaltyCooldownMs = 350;
			if (timeLeftMs <= 0) {
				phase = 'lose';
				failReason = 'Time ran out.';
			}
		};

		// moving obstacles (faster each round)
		const speedMul = 0.75 + level * 0.34;
		for (const o of spec.obstacles) {
			if (!o.vx && !o.vy) continue;
			o.x += (o.vx ?? 0) * dt * speedMul;
			o.y += (o.vy ?? 0) * dt * speedMul;
			// bounce inside safe area
			const pad = 1.1;
			const minX = pad;
			const maxX = world.w - pad;
			const minY = pad;
			const maxY = world.h - pad;
			if (o.x < minX) {
				o.x = minX;
				o.vx = Math.abs(o.vx ?? 0);
			} else if (o.x > maxX) {
				o.x = maxX;
				o.vx = -Math.abs(o.vx ?? 0);
			}
			if (o.y < minY) {
				o.y = minY;
				o.vy = Math.abs(o.vy ?? 0);
			} else if (o.y > maxY) {
				o.y = maxY;
				o.vy = -Math.abs(o.vy ?? 0);
			}
		}

		const steer = clamp((right ? 1 : 0) - (left ? 1 : 0) + joyX, -1, 1);
		const throttle = clamp((accel ? 1 : 0) - (reverse ? 1 : 0) + -joyY, -1, 1);

		// steering: realistic-ish (less turn at high speed)
		const speed = Math.abs(car.v);
		const steerGain = 2.2 / (1 + speed * 0.55);
		car.a += steer * dt * steerGain * (0.6 + speed * 0.22);

		// accel/reverse
		car.v += throttle * dt * 3.4;
		// brake (space) quickly damps velocity
		if (brake) car.v *= Math.pow(0.45, dt * 6.2);
		// friction
		car.v *= Math.pow(0.90, dt * 6);
		car.v = clamp(car.v, -2.2, 3.2);

		// integrate
		car.x += Math.cos(car.a) * car.v * dt;
		car.y += Math.sin(car.a) * car.v * dt;

		// hard-ish walls with bounce
		const minX = 0.85;
		const maxX = world.w - 0.85;
		const minY = 0.85;
		const maxY = world.h - 0.85;
		if (car.x < minX) {
			car.x = minX;
			car.v *= -0.32;
			applyCollisionPenalty();
		}
		if (car.x > maxX) {
			car.x = maxX;
			car.v *= -0.32;
			applyCollisionPenalty();
		}
		if (car.y < minY) {
			car.y = minY;
			car.v *= -0.32;
			applyCollisionPenalty();
		}
		if (car.y > maxY) {
			car.y = maxY;
			car.v *= -0.32;
			applyCollisionPenalty();
		}

		// cone collisions
		for (const o of spec.obstacles) {
			const dx = car.x - o.x;
			const dy = car.y - o.y;
			const d = Math.hypot(dx, dy);
			const minD = o.r + 0.45;
			if (d < minD) {
				const nx = d > 0.0001 ? dx / d : 1;
				const ny = d > 0.0001 ? dy / d : 0;
				car.x = o.x + nx * minD;
				car.y = o.y + ny * minD;
				car.v *= -0.22;
				applyCollisionPenalty();
			}
		}

		const inside = inSpot();
		// minimalist win condition: stay inside for 5s; leaving resets the countdown
		if (inside) parkHoldMs = Math.min(HOLD_TO_WIN_MS, parkHoldMs + dt * 1000);
		else parkHoldMs = 0;
	}

	function draw() {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const rect = canvas.getBoundingClientRect();
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		const W = Math.max(1, Math.floor(rect.width * dpr));
		const H = Math.max(1, Math.floor(rect.height * dpr));
		if (canvas.width !== W || canvas.height !== H) {
			canvas.width = W;
			canvas.height = H;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const pad = 18;
		const scale = Math.min((rect.width - pad * 2) / world.w, (rect.height - pad * 2) / world.h);
		const ox = (rect.width - world.w * scale) / 2;
		const oy = (rect.height - world.h * scale) / 2;
		const tx = (x: number) => ox + x * scale;
		const ty = (y: number) => oy + y * scale;

		// background
		ctx.clearRect(0, 0, rect.width, rect.height);
		const g = ctx.createLinearGradient(0, 0, rect.width, rect.height);
		g.addColorStop(0, 'rgba(56,189,248,0.10)');
		g.addColorStop(1, 'rgba(34,197,94,0.10)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, rect.width, rect.height);

		// lot boundary
		ctx.strokeStyle = 'rgba(255,255,255,0.24)';
		ctx.lineWidth = 2;
		ctx.strokeRect(tx(0.6), ty(0.6), (world.w - 1.2) * scale, (world.h - 1.2) * scale);

		// obstacles (cones)
		for (const o of spec.obstacles) {
			ctx.fillStyle = 'rgba(251,191,36,0.9)';
			ctx.beginPath();
			ctx.arc(tx(o.x), ty(o.y), o.r * scale, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = 'rgba(15,23,42,0.25)';
			ctx.stroke();
		}

		// parking spot
		ctx.save();
		ctx.translate(tx(spec.spot.x), ty(spec.spot.y));
		ctx.rotate(spec.spot.a);
		ctx.strokeStyle = 'rgba(34,197,94,0.65)';
		ctx.setLineDash([10, 7]);
		ctx.lineWidth = 3;
		ctx.strokeRect(
			(-spec.spot.w / 2) * scale,
			(-spec.spot.h / 2) * scale,
			spec.spot.w * scale,
			spec.spot.h * scale,
		);
		ctx.restore();
		ctx.setLineDash([]);

		// guide ring
		ctx.fillStyle = 'rgba(34,197,94,0.14)';
		ctx.beginPath();
		ctx.arc(tx(spec.spot.x), ty(spec.spot.y), 18 + (parkHoldMs / 1000) * 6, 0, Math.PI * 2);
		ctx.fill();

		// car
		ctx.save();
		ctx.translate(tx(car.x), ty(car.y));
		ctx.rotate(car.a);
		const cw = 0.92 * scale;
		const ch = 1.62 * scale;
		// shadow
		ctx.fillStyle = 'rgba(0,0,0,0.18)';
		ctx.beginPath();
		ctx.ellipse(0, 6, cw * 0.52, ch * 0.42, 0, 0, Math.PI * 2);
		ctx.fill();
		// wheels
		ctx.fillStyle = 'rgba(15,23,42,0.65)';
		const ww = cw * 0.18;
		const wh = ch * 0.18;
		ctx.beginPath();
		ctx.roundRect(-cw / 2 - 2, -ch * 0.32, ww, wh, 6);
		ctx.roundRect(cw / 2 - ww + 2, -ch * 0.32, ww, wh, 6);
		ctx.roundRect(-cw / 2 - 2, ch * 0.14, ww, wh, 6);
		ctx.roundRect(cw / 2 - ww + 2, ch * 0.14, ww, wh, 6);
		ctx.fill();
		// body (gradient)
		const bg = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
		bg.addColorStop(0, 'rgba(255,255,255,0.95)');
		bg.addColorStop(1, 'rgba(214,246,255,0.88)');
		ctx.fillStyle = bg;
		ctx.strokeStyle = 'rgba(15,23,42,0.28)';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 14);
		ctx.fill();
		ctx.stroke();
		// windshield
		ctx.fillStyle = 'rgba(56,189,248,0.55)';
		ctx.beginPath();
		ctx.roundRect(-cw / 2 + 10, -ch / 2 + 14, cw - 20, ch * 0.30, 10);
		ctx.fill();
		// tail lights
		ctx.fillStyle = 'rgba(251,113,133,0.65)';
		ctx.beginPath();
		ctx.roundRect(-cw / 2 + 10, ch / 2 - 18, 10, 10, 4);
		ctx.roundRect(cw / 2 - 20, ch / 2 - 18, 10, 10, 4);
		ctx.fill();
		ctx.restore();

		// progress to park
		ctx.fillStyle = 'rgba(15,23,42,0.28)';
		ctx.fillRect(ox, oy + world.h * scale + 14, world.w * scale, 8);
		ctx.fillStyle = 'rgba(34,197,94,0.85)';
		ctx.fillRect(
			ox,
			oy + world.h * scale + 14,
			world.w * scale * clamp(parkHoldMs / HOLD_TO_WIN_MS, 0, 1),
			8,
		);
	}

	function loop(prev: number) {
		raf = requestAnimationFrame((now) => {
			const dt = Math.min(0.033, (now - prev) / 1000);
			if (phase === 'play') {
				step(dt);
				if (phase !== 'play') {
					draw();
					loop(now);
					return;
				}
				timeMs = now - startedAt;
				if (parkHoldMs >= HOLD_TO_WIN_MS) {
					phase = 'win';
					bestMs = bestMs === null ? timeMs : Math.min(bestMs, timeMs);
					score = Math.max(0, Math.round(1200 + (timeLeftMs / 1000) * 12 - (timeMs / 1000) * 4));
					onWin({ score: Math.max(10, Math.round(1500 / Math.max(1, timeMs))), timeMs });
				}
			}
			draw();
			loop(now);
		});
	}

	$effect(() => {
		if (!open) return;
		cancelAnimationFrame(raf);
		requestAnimationFrame((t) => loop(t));
	});

	function onJoyStart(e: PointerEvent) {
		joyActive = true;
		(e.target as HTMLElement).setPointerCapture?.(e.pointerId);
	}
	function onJoyMove(e: PointerEvent) {
		if (!joyActive) return;
		const el = e.currentTarget as HTMLElement;
		const r = el.getBoundingClientRect();
		const x = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 1;
		const y = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * 1;
		joyX = clamp(x, -1, 1);
		joyY = clamp(y, -1, 1);
	}
	function onJoyEnd() {
		joyActive = false;
		joyX = 0;
		joyY = 0;
	}
</script>

{#if open}
	<div class="sp-game">
		<div class={'sp-game__veil ' + (phase === 'reveal' ? 'is-reveal' : '')}></div>

		<div class="sp-game__top">
			<button class="sp-btn px-3 py-2 text-sm font-extrabold" type="button" onclick={onClose}>Exit</button>
			<div class="sp-chip sp-chip--ok">
				<span class="i-fa6-solid-car-side"></span>Parking Rush
			</div>
			<div class="sp-chip">Level {level}</div>
		</div>

		<div class="sp-game__center">
			<div class="sp-game__card sp-pop">
				{#if phase === 'reveal'}
					<div class="text-center">
						<div class="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">Parking Rush</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">Cover → Ready → Park in the green box.</div>
						<button class="mt-5 sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'menu')}>
							Continue
						</button>
					</div>
				{:else if phase === 'menu'}
					<div class="text-center">
						<div class="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">PARKING RUSH</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">Premium mini parking simulator.</div>
						<div class="mt-6 grid gap-2">
							<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'levels')}>
								Play
							</button>
							<button class="sp-btn px-6 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'ready')}>
								Quick start
							</button>
						</div>
					</div>
				{:else if phase === 'levels'}
					<div class="text-center">
						<div class="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">Select level</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">Tighter spots, more cones, less time.</div>
						<div class="mt-6 sp-levelGrid">
							{#each levels as l (l.id)}
								<button
									type="button"
									class={'sp-levelCard ' + (l.id === level ? 'is-active' : '')}
									onclick={() => {
										level = l.id;
										spec = levels[l.id - 1];
										restart();
									}}
								>
									<div class="sp-levelNum">{l.id}</div>
									<div class="sp-levelMeta">{Math.round(l.timeMs / 1000)}s</div>
								</button>
							{/each}
						</div>
						<div class="mt-6 flex items-center justify-center gap-2">
							<button class="sp-btn px-5 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'menu')}>
								Back
							</button>
							<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'ready')}>
								Continue
							</button>
						</div>
					</div>
				{:else if phase === 'ready'}
					<div class="text-center">
						<div class="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">Are you ready?!!</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">
							Use <span class="sp-chip">WASD/Arrows</span> to steer • <span class="sp-chip">Space</span> brake •
							<span class="sp-chip">S</span> reverse. On mobile, drag the joystick.
						</div>
						<div class="mt-6 flex items-center justify-center gap-2">
							<button class="sp-btn px-5 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'menu')}>Back</button>
							<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={start}>
								Start game
							</button>
						</div>
					</div>
				{:else if phase === 'paused'}
					<div class="text-center">
						<div class="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">Paused</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">Press Esc to resume.</div>
						<div class="mt-6 flex items-center justify-center gap-2">
							<button class="sp-btn px-5 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'play')}>Resume</button>
							<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={restart}>Restart</button>
						</div>
					</div>
				{:else if phase === 'win'}
					<div class="text-center">
						<div class="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">Perfect park!</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">
							Score: <span class="sp-chip sp-chip--ok">{score}</span> • Time: <span class="sp-chip">{Math.round(timeMs)} ms</span>
							{#if bestMs !== null} • Best: <span class="sp-chip">{Math.round(bestMs)} ms</span>{/if}
						</div>
						<div class="mt-6 flex items-center justify-center gap-2">
							<button class="sp-btn px-5 py-3 text-sm font-extrabold" type="button" onclick={onClose}>Done</button>
							{#if level < levels.length}
								<button
									class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold"
									type="button"
									onclick={() => {
										level = level + 1;
										spec = levels[level - 1];
										restart();
									}}
								>
									Next round
								</button>
							{:else}
								<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={() => (phase = 'levels')}>
									Play again
								</button>
							{/if}
						</div>
					</div>
				{:else if phase === 'lose'}
					<div class="text-center">
						<div class="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">Oops!</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">
							{failReason || 'Try again.'}
						</div>
						<div class="mt-6 flex items-center justify-center gap-2">
							<button class="sp-btn px-5 py-3 text-sm font-extrabold" type="button" onclick={onClose}>Exit</button>
							<button class="sp-btn sp-btn-primary px-6 py-3 text-sm font-extrabold" type="button" onclick={restart}>
								Try again
							</button>
						</div>
					</div>
				{:else}
					<div class="text-center">
						<div class="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">Park in the box</div>
						<div class="mt-2 text-sm" style="color: var(--sp-muted);">
							Hold still inside the green box to win. Leaving after entering = fail.
						</div>
					</div>
				{/if}
			</div>

			<div class="sp-game__stage">
				<canvas class="sp-game__canvas" bind:this={canvas}></canvas>

				<div class="sp-game__hud">
					<div class="sp-hudPanel">
						<div class="sp-hudRow">
							<span class="sp-hudLabel">Time</span>
							<span class="sp-hudValue">{Math.ceil(timeLeftMs / 1000)}s</span>
						</div>
						<div class="sp-hudRow">
							<span class="sp-hudLabel">Hold</span>
							<span class="sp-hudValue">{Math.max(0, Math.ceil((HOLD_TO_WIN_MS - parkHoldMs) / 1000))}s</span>
						</div>
						<div class="sp-hudRow">
							<span class="sp-hudLabel">Speed</span>
							<span class="sp-hudValue">{Math.round(Math.abs(car.v) * 18)} km/h</span>
						</div>
					</div>
				</div>

				<div class="sp-game__joyWrap sm:hidden">
					<div
						class={'sp-game__joy ' + (joyActive ? 'is-active' : '')}
						role="application"
						aria-label="Parking Rush joystick"
						onpointerdown={onJoyStart}
						onpointermove={onJoyMove}
						onpointerup={onJoyEnd}
						onpointercancel={onJoyEnd}
					>
						<div class="sp-game__joyKnob" style="transform: translate({joyX * 22}px, {joyY * 22}px);"></div>
					</div>
					<div class="text-[11px] font-extrabold mt-2" style="color: var(--sp-muted); text-align:center;">
						Drag to steer & accelerate
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}

