<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { onMount } from 'svelte';
	import ConfettiBurst from './ConfettiBurst.svelte';

	let {
		xp = 0,
		label = 'BOOKING CONFIRMED',
		receipt = '',
	}: { xp?: number; label?: string; receipt?: string } = $props();

	let rot = $state<[number, number, number]>([0.25, 0.6, 0]);
	let t = $state(0);

	// precomputed particle “seeds”
	const seeds = Array.from({ length: 26 }, (_, i) => {
		const a = (i / 26) * Math.PI * 2;
		return { a, r: 0.8 + (i % 6) * 0.08, y: -0.2 + (i % 7) * 0.08 };
	});

	onMount(() => {
		let raf = 0;
		const loop = () => {
			t += 1;
			rot = [rot[0] + 0.012, rot[1] + 0.035, rot[2] + 0.018];
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="sp-reward">
	<div class="sp-reward__bg"></div>
	<div class="sp-reward__card sp-pop" role="status" aria-live="polite">
		<div class="sp-reward__header">
			<div class="sp-reward__title">{label}</div>
			<div class="sp-reward__meta">
				<span class="sp-reward__xp">+{xp} XP</span>
				{#if receipt}
					<span class="sp-reward__dot">•</span>
					<span class="sp-reward__receipt">{receipt}</span>
				{/if}
			</div>
		</div>

		<div class="sp-reward__stage">
			<div class="sp-reward__confetti">
				<ConfettiBurst durationMs={1400} intensity={0.85} bursts={2} />
			</div>
			<div class="sp-reward__spark sp-reward__spark--a"></div>
			<div class="sp-reward__spark sp-reward__spark--b"></div>
			<div class="sp-reward__spark sp-reward__spark--c"></div>

			<div class="sp-reward__canvasWrap">
				<Canvas dpr={2}>
					<ambientLight intensity={0.9}></ambientLight>
					<directionalLight position={[2, 2, 2]} intensity={1.4}></directionalLight>
					<directionalLight position={[-2, 1, 1]} intensity={0.7}></directionalLight>

					<!-- Coin -->
					<mesh rotation={rot} position={[0, 0.12, 0]}>
						<cylinderGeometry args={[0.95, 0.95, 0.22, 56]}></cylinderGeometry>
						<meshStandardMaterial color="#22c55e" metalness={0.75} roughness={0.22}></meshStandardMaterial>
					</mesh>
					<mesh rotation={rot} position={[0, 0.12, 0.12]}>
						<circleGeometry args={[0.68, 42]}></circleGeometry>
						<meshStandardMaterial color="#b7f7ce" metalness={0.35} roughness={0.35}></meshStandardMaterial>
					</mesh>

					<!-- Floating particles -->
					{#each seeds as s, i (i)}
						<mesh position={[Math.cos(s.a + t * 0.01) * s.r, s.y + Math.sin(t * 0.02 + s.a) * 0.14, Math.sin(s.a + t * 0.01) * 0.2]}>
							<sphereGeometry args={[0.055, 14, 14]}></sphereGeometry>
							<meshStandardMaterial
								color={i % 3 === 0 ? '#38bdf8' : i % 3 === 1 ? '#86efac' : '#fbbf24'}
								metalness={0.2}
								roughness={0.35}
								emissive={i % 3 === 0 ? '#0ea5e9' : i % 3 === 1 ? '#16a34a' : '#f59e0b'}
								emissiveIntensity={0.35}
							></meshStandardMaterial>
						</mesh>
					{/each}
				</Canvas>
			</div>
		</div>

		<div class="sp-reward__footer">
			<div class="sp-reward__hint">Nice! Keep the streak going.</div>
		</div>
	</div>
</div>

