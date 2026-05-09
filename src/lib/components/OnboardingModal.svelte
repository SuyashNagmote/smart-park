<script lang="ts">
	import { onMount, tick } from 'svelte';
	import gsap from 'gsap';

	let { onClose }: { onClose?: () => void } = $props();

	const ONBOARDED_KEY = 'sp_onboarded';

	let step = $state<1 | 2 | 3>(1);
	let modalEl: HTMLDivElement;
	let stepEls: HTMLDivElement[] = [];

	function markOnboarded() {
		try {
			localStorage.setItem(ONBOARDED_KEY, 'true');
		} catch {
			// localStorage may be unavailable in some environments
		}
	}

	function close() {
		markOnboarded();
		gsap.to(modalEl, {
			opacity: 0,
			scale: 0.96,
			y: 8,
			duration: 0.16,
			ease: 'power2.in',
			onComplete: () => onClose?.()
		});
	}

	async function goToStep(next: 1 | 2 | 3) {
		const dir = next > step ? -1 : 1;
		const currentEl = stepEls[step - 1];
		const nextEl = stepEls[next - 1];

		if (!currentEl || !nextEl) {
			step = next;
			return;
		}

		await gsap.to(currentEl, {
			x: `${dir * -60}%`,
			opacity: 0,
			duration: 0.2,
			ease: 'power2.in'
		});

		step = next;
		await tick();

		gsap.fromTo(
			nextEl,
			{ x: `${dir * 60}%`, opacity: 0 },
			{ x: '0%', opacity: 1, duration: 0.25, ease: 'power2.out' }
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			close();
		}
		// Focus trap: keep Tab within modal
		if (e.key === 'Tab' && modalEl) {
			const focusable = modalEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			);
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		}
	}

	onMount(() => {
		// Entrance animation
		gsap.fromTo(
			modalEl,
			{ opacity: 0, scale: 0.96, y: 8 },
			{ opacity: 1, scale: 1, y: 0, duration: 0.22, ease: 'power2.out' }
		);

		// Focus the modal for keyboard accessibility
		modalEl?.focus();
	});
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<div class="onboarding-backdrop" aria-hidden="true" onclick={close}></div>

<!-- Modal -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="onboarding-modal"
	role="dialog"
	aria-modal="true"
	aria-label="Welcome to Smart Park"
	tabindex="-1"
	bind:this={modalEl}
>
	<!-- Progress dots -->
	<div class="onboarding-progress" aria-label="Step {step} of 3">
		{#each [1, 2, 3] as s}
			<button
				class="onboarding-dot"
				class:is-active={step === s}
				class:is-done={step > s}
				aria-label="Go to step {s}"
				onclick={() => goToStep(s as 1 | 2 | 3)}
			></button>
		{/each}
	</div>

	<!-- Step content area -->
	<div class="onboarding-steps">
		<!-- Step 1: Welcome & XP intro -->
		<div
			class="onboarding-step"
			class:is-visible={step === 1}
			bind:this={stepEls[0]}
			aria-hidden={step !== 1}
		>
			<div class="onboarding-logo">
				<span class="onboarding-logo-inner">SP</span>
			</div>
			<h2 class="onboarding-heading">Welcome to Smart Park 🎉</h2>
			<p class="onboarding-body">
				You earn XP for every smart parking choice — cheaper lots, closer spots, and EV charging.
			</p>
			<!-- XP coin visual -->
			<div class="onboarding-xp-demo">
				<div class="sp-xpburst__coin onboarding-coin">
					<div class="sp-xpburst__coinInner"></div>
				</div>
				<div class="onboarding-xp-label">
					<span class="onboarding-xp-value">+50 XP</span>
					<span class="onboarding-xp-sub">per smart booking</span>
				</div>
			</div>
		</div>

		<!-- Step 2: Find & Book -->
		<div
			class="onboarding-step"
			class:is-visible={step === 2}
			bind:this={stepEls[1]}
			aria-hidden={step !== 2}
		>
			<div class="onboarding-icon-wrap">
				<span class="i-fa6-solid-map-location-dot onboarding-big-icon" aria-hidden="true"></span>
			</div>
			<h2 class="onboarding-heading">Find and book in seconds</h2>
			<p class="onboarding-body">
				Tap any lot on the map, compare price tiers, pick your duration, and confirm. Your receipt
				downloads automatically.
			</p>
		</div>

		<!-- Step 3: Gamification -->
		<div
			class="onboarding-step"
			class:is-visible={step === 3}
			bind:this={stepEls[2]}
			aria-hidden={step !== 3}
		>
			<div class="onboarding-icons-row">
				<div class="onboarding-icon-badge">
					<span class="i-fa6-solid-fire-flame-curved onboarding-badge-icon" aria-hidden="true"></span>
					<span class="onboarding-badge-label">Streak</span>
				</div>
				<div class="onboarding-icon-badge">
					<span class="i-fa6-solid-star onboarding-badge-icon" aria-hidden="true"></span>
					<span class="onboarding-badge-label">Level</span>
				</div>
				<div class="onboarding-icon-badge">
					<span class="i-fa6-solid-trophy onboarding-badge-icon" aria-hidden="true"></span>
					<span class="onboarding-badge-label">Quests</span>
				</div>
			</div>
			<h2 class="onboarding-heading">Level up with every park</h2>
			<p class="onboarding-body">
				Complete daily quests, maintain your streak, and play Parking Rush to earn bonus XP and
				badges.
			</p>
		</div>
	</div>

	<!-- Navigation -->
	<div class="onboarding-nav">
		{#if step < 3}
			<button class="sp-btn sp-btn-primary onboarding-next" onclick={() => goToStep((step + 1) as 2 | 3)}>
				Next →
			</button>
			<button class="onboarding-skip" onclick={close}>Skip</button>
		{:else}
			<button class="sp-btn sp-btn-primary onboarding-next" onclick={close}>
				Get started →
			</button>
		{/if}
	</div>
</div>

<style>
	.onboarding-backdrop {
		position: fixed;
		inset: 0;
		z-index: 80;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
	}

	.onboarding-modal {
		position: fixed;
		inset: 0;
		z-index: 81;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.onboarding-modal > :global(*) {
		pointer-events: auto;
	}

	/* Re-structure: modal is the overlay, card is inside */
	.onboarding-progress,
	.onboarding-steps,
	.onboarding-nav {
		pointer-events: auto;
	}

	/* Card wrapper — we use the modal element itself as the card */
	.onboarding-modal {
		flex-direction: column;
		gap: 0;
		width: min(520px, calc(100vw - 32px));
		max-height: calc(100svh - 48px);
		margin: auto;
		inset: unset;
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border-radius: 24px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface-strong);
		box-shadow: 0 32px 120px rgba(0, 0, 0, 0.45);
		padding: 28px 28px 24px;
		overflow: hidden;
		outline: none;
	}

	/* Progress dots */
	.onboarding-progress {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		margin-bottom: 28px;
	}

	.onboarding-dot {
		width: 8px;
		height: 8px;
		border-radius: 999px;
		border: none;
		background: var(--sp-border);
		cursor: pointer;
		padding: 0;
		transition: background 200ms ease, width 200ms ease;
	}

	.onboarding-dot.is-active {
		width: 24px;
		background: var(--sp-brand);
	}

	.onboarding-dot.is-done {
		background: color-mix(in srgb, var(--sp-brand) 50%, var(--sp-border));
	}

	/* Steps container */
	.onboarding-steps {
		position: relative;
		min-height: 240px;
		overflow: hidden;
	}

	.onboarding-step {
		display: none;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 14px;
	}

	.onboarding-step.is-visible {
		display: flex;
	}

	/* Step 1 — Logo */
	.onboarding-logo {
		width: 64px;
		height: 64px;
		border-radius: 18px;
		background: linear-gradient(135deg, var(--sp-brand-2), var(--sp-brand));
		display: grid;
		place-items: center;
		box-shadow: 0 12px 40px color-mix(in srgb, var(--sp-brand) 35%, transparent);
	}

	.onboarding-logo-inner {
		font-family: var(--sp-font-display);
		font-size: 22px;
		font-weight: 800;
		color: #05210f;
		letter-spacing: -0.03em;
	}

	/* XP demo */
	.onboarding-xp-demo {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 20px;
		border-radius: 14px;
		border: 1px solid var(--sp-border);
		background: color-mix(in srgb, var(--sp-surface) 80%, transparent);
		margin-top: 4px;
	}

	.onboarding-coin {
		/* Inherits .sp-xpburst__coin styles from app.css */
		animation: none; /* disable spin in onboarding context */
	}

	.onboarding-xp-label {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
	}

	.onboarding-xp-value {
		font-family: var(--sp-font-display);
		font-size: 18px;
		font-weight: 800;
		color: var(--sp-brand);
		letter-spacing: -0.02em;
	}

	.onboarding-xp-sub {
		font-size: 12px;
		color: var(--sp-muted);
		font-weight: 500;
	}

	/* Step 2 — Map icon */
	.onboarding-icon-wrap {
		width: 72px;
		height: 72px;
		border-radius: 20px;
		background: color-mix(in srgb, var(--sp-brand) 12%, var(--sp-surface));
		border: 1px solid color-mix(in srgb, var(--sp-brand) 25%, var(--sp-border));
		display: grid;
		place-items: center;
	}

	.onboarding-big-icon {
		width: 32px;
		height: 32px;
		color: var(--sp-brand);
		display: block;
	}

	/* Step 3 — Icons row */
	.onboarding-icons-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin-bottom: 4px;
	}

	.onboarding-icon-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 14px 16px;
		border-radius: 16px;
		border: 1px solid var(--sp-border);
		background: color-mix(in srgb, var(--sp-surface) 80%, transparent);
		min-width: 72px;
	}

	.onboarding-badge-icon {
		width: 24px;
		height: 24px;
		color: var(--sp-brand);
		display: block;
	}

	.onboarding-badge-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--sp-muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Shared text styles */
	.onboarding-heading {
		font-family: var(--sp-font-display);
		font-size: 22px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--sp-text);
		margin: 0;
	}

	.onboarding-body {
		font-size: 15px;
		color: var(--sp-muted);
		line-height: 1.6;
		margin: 0;
		max-width: 380px;
	}

	/* Navigation */
	.onboarding-nav {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-top: 28px;
	}

	.onboarding-next {
		width: 100%;
		padding: 13px 24px;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
		border-radius: 14px;
	}

	.onboarding-skip {
		background: none;
		border: none;
		padding: 4px 8px;
		font-size: 14px;
		color: var(--sp-muted);
		cursor: pointer;
		font-weight: 500;
		transition: color 150ms ease;
	}

	.onboarding-skip:hover {
		color: var(--sp-text);
	}

	/* Reduced motion: disable GSAP-driven animations */
	@media (prefers-reduced-motion: reduce) {
		.onboarding-dot {
			transition: none;
		}
	}
</style>
