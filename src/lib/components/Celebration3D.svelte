<script lang="ts">
	// Lightweight Threlte celebration: a spinning "coin" + glow.
	// Only rendered briefly after booking.
	import { Canvas } from '@threlte/core';
	import { onMount } from 'svelte';

	let { label = 'Nice!' }: { label?: string } = $props();

	let rot = $state<[number, number, number]>([0.25, 0.6, 0]);

	onMount(() => {
		let raf = 0;
		const loop = () => {
			rot = [rot[0] + 0.01, rot[1] + 0.03, rot[2] + 0.02];
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
</script>

<div class="w-[260px] h-[220px]">
	<Canvas dpr={2}>
		<ambientLight intensity={0.9}></ambientLight>
		<directionalLight position={[2, 2, 2]} intensity={1.2}></directionalLight>

		<mesh rotation={rot}>
			<cylinderGeometry args={[0.8, 0.8, 0.18, 48]}></cylinderGeometry>
			<meshStandardMaterial color="#22c55e" metalness={0.65} roughness={0.25}></meshStandardMaterial>
		</mesh>
	</Canvas>
	<div class="text-center mt-2 text-sm font-extrabold">{label}</div>
</div>

