<script lang="ts">
	import { onMount } from 'svelte';

	onMount(() => {
		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const cards = document.querySelectorAll('.feature-card');
		if (!reducedMotion) {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((e) => {
						if (e.isIntersecting) {
							(e.target as HTMLElement).classList.add('is-visible');
							observer.unobserve(e.target);
						}
					});
				},
				{ threshold: 0.15 }
			);
			cards.forEach((c) => observer.observe(c));
		} else {
			cards.forEach((c) => c.classList.add('is-visible'));
		}
	});
</script>

<svelte:head>
	<title>Smart Park — Find parking faster. Pay smarter.</title>
</svelte:head>

<div class="page-root">
	<!-- ─── Sticky Navbar ─────────────────────────────────────────── -->
	<header class="navbar-wrap">
		<div class="sp-shell">
			<nav class="navbar sp-glass">
				<!-- Logo + name -->
				<a href="/" class="navbar-brand" aria-label="Smart Park home">
					<div class="navbar-logo" aria-hidden="true">SP</div>
					<span class="navbar-name">Smart Park</span>
				</a>

				<!-- Nav links -->
				<div class="navbar-links">
					<a class="sp-pill" href="/login">Sign in</a>
					<a class="sp-btn sp-btn-primary navbar-cta" href="/signup">Get started</a>
				</div>
			</nav>
		</div>
	</header>

	<!-- ─── Hero Section ─────────────────────────────────────────── -->
	<section class="hero-section" aria-label="Hero">
		<!-- Subtle radial glow top-right -->
		<div class="hero-glow" aria-hidden="true"></div>

		<div class="sp-shell hero-inner">
			<!-- Left column: copy + CTAs -->
			<div class="hero-copy">
				<!-- Badge chip -->
				<div class="hero-badge">
					<span class="i-fa6-solid-bolt" aria-hidden="true"></span>
					⚡ Now live in Pune
				</div>

				<!-- H1 headline -->
				<h1 class="hero-h1">
					Find parking faster.<br />
					<span class="hero-h1-accent">Pay smarter.</span>
				</h1>

				<!-- Subheadline -->
				<p class="hero-sub">
					Live lot discovery, instant booking, and XP rewards for every smart parking choice.
					Compare prices in real time and reserve your spot in seconds.
				</p>

				<!-- CTA buttons -->
				<div class="hero-ctas">
					<a class="sp-btn sp-btn-primary hero-cta-primary" href="/signup">
						Get started — it's free
					</a>
					<a class="sp-btn hero-cta-secondary" href="/login">Sign in</a>
				</div>

				<!-- Social proof row -->
				<div class="social-proof" role="list" aria-label="Trust signals">
					<div class="social-proof-badge" role="listitem">
						<span class="i-fa6-solid-location-dot social-proof-icon" aria-hidden="true"></span>
						<span>90+ live lots</span>
					</div>
					<div class="social-proof-sep" aria-hidden="true">·</div>
					<div class="social-proof-badge" role="listitem">
						<span class="i-fa6-solid-rotate social-proof-icon" aria-hidden="true"></span>
						<span>Real-time updates every 3s</span>
					</div>
					<div class="social-proof-sep" aria-hidden="true">·</div>
					<div class="social-proof-badge" role="listitem">
						<span class="i-fa6-solid-star social-proof-icon" aria-hidden="true"></span>
						<span>Gamified XP rewards</span>
					</div>
				</div>
			</div>

			<!-- Right column: decorative parking grid (desktop only) -->
			<div class="hero-visual" aria-hidden="true">
				<div class="parking-grid-wrap">
					<svg
						viewBox="0 0 320 260"
						width="320"
						height="260"
						xmlns="http://www.w3.org/2000/svg"
						class="parking-grid-svg"
						aria-hidden="true"
					>
						<!-- Road lines -->
						<rect x="0" y="0" width="320" height="260" rx="16" fill="none" />
						<!-- Parking rows -->
						{#each [0, 1, 2, 3] as row}
							{#each [0, 1, 2, 3, 4] as col}
								{@const x = 16 + col * 58}
								{@const y = 16 + row * 58}
								{@const occupied = (row * 5 + col) % 3 === 0}
								<rect
									{x}
									{y}
									width="48"
									height="48"
									rx="8"
									fill={occupied
										? 'color-mix(in srgb, var(--sp-brand) 18%, transparent)'
										: 'color-mix(in srgb, var(--sp-border) 60%, transparent)'}
									stroke="var(--sp-border)"
									stroke-width="1"
								/>
								{#if occupied}
									<!-- Car silhouette in occupied spot -->
									<rect
										x={x + 8}
										y={y + 14}
										width="32"
										height="20"
										rx="5"
										fill="color-mix(in srgb, var(--sp-brand) 55%, transparent)"
									/>
									<ellipse
										cx={x + 16}
										cy={y + 34}
										rx="5"
										ry="5"
										fill="color-mix(in srgb, var(--sp-brand) 30%, transparent)"
									/>
									<ellipse
										cx={x + 32}
										cy={y + 34}
										rx="5"
										ry="5"
										fill="color-mix(in srgb, var(--sp-brand) 30%, transparent)"
									/>
								{/if}
							{/each}
						{/each}
						<!-- "P" label -->
						<text
							x="160"
							y="248"
							text-anchor="middle"
							font-size="11"
							font-weight="700"
							fill="var(--sp-muted)"
							font-family="var(--sp-font-body)"
						>
							Parking lot · Pune
						</text>
					</svg>
					<!-- Live badge overlay -->
					<div class="parking-live-badge">
						<span class="parking-live-dot" aria-hidden="true"></span>
						Live
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Features Section ─────────────────────────────────────── -->
	<section class="features-section" aria-labelledby="features-heading">
		<div class="sp-shell">
			<div class="section-header">
				<h2 id="features-heading" class="section-title">Everything you need to park smarter</h2>
				<p class="section-sub">
					Smart Park combines real-time data, dynamic pricing, and gamification into one seamless
					experience.
				</p>
			</div>

			<div class="features-grid">
				<!-- Card 1: Discover lots -->
				<div class="feature-card sp-card" style="transition-delay: 0ms;" aria-label="Discover lots feature">
					<div class="feature-icon-wrap feature-icon-map">
						<span class="i-fa6-solid-map-location-dot feature-icon" aria-hidden="true"></span>
					</div>
					<h3 class="feature-heading">Discover lots</h3>
					<p class="feature-desc">
						Browse 90+ live parking lots across Pune sourced from OpenStreetMap, updated in real
						time.
					</p>
				</div>

				<!-- Card 2: Live pricing -->
				<div class="feature-card sp-card" style="transition-delay: 80ms;" aria-label="Live pricing feature">
					<div class="feature-icon-wrap feature-icon-chart">
						<span class="i-fa6-solid-chart-line feature-icon" aria-hidden="true"></span>
					</div>
					<h3 class="feature-heading">Live pricing</h3>
					<p class="feature-desc">
						AI-driven surge pricing updates every 3 seconds — always know the best time and place
						to park.
					</p>
				</div>

				<!-- Card 3: Instant booking -->
				<div class="feature-card sp-card" style="transition-delay: 160ms;" aria-label="Instant booking feature">
					<div class="feature-icon-wrap feature-icon-ticket">
						<span class="i-fa6-solid-ticket feature-icon" aria-hidden="true"></span>
					</div>
					<h3 class="feature-heading">Instant booking</h3>
					<p class="feature-desc">
						Pick your duration, choose a price tier, confirm in one tap, and download your receipt
						instantly.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── How It Works Section ─────────────────────────────────── -->
	<section class="hiw-section" aria-labelledby="hiw-heading">
		<div class="sp-shell">
			<div class="section-header">
				<h2 id="hiw-heading" class="section-title">How it works</h2>
				<p class="section-sub">Three steps from open to parked.</p>
			</div>

			<div class="hiw-steps">
				<!-- Step 1 -->
				<div class="hiw-step">
					<div class="hiw-step-num-wrap">
						<div class="hiw-step-num" aria-hidden="true">
							<span class="i-fa6-solid-magnifying-glass hiw-step-icon"></span>
						</div>
						<div class="hiw-connector" aria-hidden="true"></div>
					</div>
					<div class="hiw-step-body">
						<div class="hiw-step-label">Step 1</div>
						<h3 class="hiw-step-title">Find a lot</h3>
						<p class="hiw-step-desc">
							Open the map, browse live availability, and filter by price, distance, or EV
							charging.
						</p>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="hiw-step">
					<div class="hiw-step-num-wrap">
						<div class="hiw-step-num" aria-hidden="true">
							<span class="i-fa6-solid-bolt hiw-step-icon"></span>
						</div>
						<div class="hiw-connector" aria-hidden="true"></div>
					</div>
					<div class="hiw-step-body">
						<div class="hiw-step-label">Step 2</div>
						<h3 class="hiw-step-title">Compare &amp; book</h3>
						<p class="hiw-step-desc">
							Choose your duration and price tier — Standard, Flex, or Green Saver — and confirm
							in seconds.
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="hiw-step">
					<div class="hiw-step-num-wrap">
						<div class="hiw-step-num" aria-hidden="true">
							<span class="i-fa6-solid-check hiw-step-icon"></span>
						</div>
						<!-- No connector after last step -->
					</div>
					<div class="hiw-step-body">
						<div class="hiw-step-label">Step 3</div>
						<h3 class="hiw-step-title">Earn XP &amp; rewards</h3>
						<p class="hiw-step-desc">
							Every smart choice earns XP. Level up, maintain your streak, and unlock badges.
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ─── Footer ───────────────────────────────────────────────── -->
	<footer class="site-footer">
		<div class="sp-shell footer-inner">
			<p class="footer-copy">© {new Date().getFullYear()} Smart Park. All rights reserved.</p>
			<nav class="footer-links" aria-label="Footer navigation">
				<a href="/login" class="footer-link">Sign in</a>
				<a href="/signup" class="footer-link">Get started</a>
			</nav>
		</div>
	</footer>
</div>

<style>
	/* ── Page root ─────────────────────────────────────────────────── */
	.page-root {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		background-color: var(--sp-bg0);
	}

	/* ── Navbar ────────────────────────────────────────────────────── */
	.navbar-wrap {
		position: sticky;
		top: 0;
		z-index: 50;
		padding: 12px 0;
		background: color-mix(in srgb, var(--sp-bg0) 80%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.navbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px 20px;
		border-radius: 20px;
	}

	.navbar-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: var(--sp-text);
	}

	.navbar-logo {
		width: 36px;
		height: 36px;
		border-radius: 10px;
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 13px;
		color: #05210f;
		background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand));
		flex-shrink: 0;
	}

	.navbar-name {
		font-weight: 700;
		font-size: 15px;
		letter-spacing: -0.01em;
		font-family: var(--sp-font-display);
	}

	.navbar-links {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.navbar-cta {
		padding: 9px 18px;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}

	/* ── Hero ──────────────────────────────────────────────────────── */
	.hero-section {
		position: relative;
		min-height: 100svh;
		display: flex;
		align-items: center;
		overflow: hidden;
	}

	.hero-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: radial-gradient(
			600px 400px at 85% 15%,
			color-mix(in srgb, var(--sp-brand) 8%, transparent),
			transparent 70%
		);
		z-index: 0;
	}

	.hero-inner {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: 1fr;
		gap: 48px;
		align-items: center;
		padding-top: 48px;
		padding-bottom: 64px;
	}

	@media (min-width: 1024px) {
		.hero-inner {
			grid-template-columns: 1fr 1fr;
			gap: 64px;
			padding-top: 64px;
			padding-bottom: 80px;
		}
	}

	/* Hero copy */
	.hero-copy {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.hero-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 14px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--sp-brand) 35%, var(--sp-border));
		background: color-mix(in srgb, var(--sp-brand) 10%, transparent);
		color: var(--sp-brand);
		font-size: 12px;
		font-weight: 700;
		width: fit-content;
		margin-bottom: 20px;
	}

	.hero-h1 {
		font-family: var(--sp-font-display);
		font-size: 36px;
		font-weight: 800;
		line-height: 1.08;
		letter-spacing: -0.03em;
		color: var(--sp-text);
		margin: 0 0 20px;
	}

	@media (min-width: 768px) {
		.hero-h1 {
			font-size: 56px;
		}
	}

	.hero-h1-accent {
		color: var(--sp-brand);
	}

	.hero-sub {
		font-size: 16px;
		line-height: 1.6;
		color: var(--sp-muted);
		margin: 0 0 32px;
		max-width: 480px;
	}

	@media (min-width: 768px) {
		.hero-sub {
			font-size: 18px;
		}
	}

	/* CTA buttons */
	.hero-ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 32px;
	}

	.hero-cta-primary {
		padding: 14px 24px;
		font-size: 15px;
		font-weight: 700;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		border-radius: 14px;
	}

	.hero-cta-secondary {
		padding: 14px 24px;
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		border-radius: 14px;
	}

	/* Social proof */
	.social-proof {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}

	.social-proof-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-muted);
	}

	.social-proof-icon {
		color: var(--sp-brand);
		font-size: 12px;
	}

	.social-proof-sep {
		color: var(--sp-border);
		font-size: 16px;
		line-height: 1;
	}

	/* Hero visual (desktop only) */
	.hero-visual {
		display: none;
	}

	@media (min-width: 1024px) {
		.hero-visual {
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.parking-grid-wrap {
		position: relative;
		border-radius: 20px;
		border: 1px solid var(--sp-border);
		background: var(--sp-surface);
		box-shadow: var(--sp-shadow);
		padding: 20px;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.parking-grid-svg {
		display: block;
		max-width: 100%;
	}

	.parking-live-badge {
		position: absolute;
		top: 12px;
		right: 12px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--sp-brand) 15%, transparent);
		border: 1px solid color-mix(in srgb, var(--sp-brand) 35%, var(--sp-border));
		color: var(--sp-brand);
		font-size: 11px;
		font-weight: 700;
	}

	.parking-live-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--sp-brand);
		animation: livePulse 1.8s ease-in-out infinite;
	}

	@keyframes livePulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	@media (prefers-reduced-motion: reduce) {
		.parking-live-dot {
			animation: none;
		}
	}

	/* ── Features Section ──────────────────────────────────────────── */
	.features-section {
		padding: 80px 0;
		background: var(--sp-bg1);
	}

	.section-header {
		text-align: center;
		margin-bottom: 48px;
	}

	.section-title {
		font-family: var(--sp-font-display);
		font-size: 28px;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--sp-text);
		margin: 0 0 12px;
	}

	@media (min-width: 768px) {
		.section-title {
			font-size: 36px;
		}
	}

	.section-sub {
		font-size: 16px;
		color: var(--sp-muted);
		max-width: 520px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.features-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 20px;
	}

	@media (min-width: 768px) {
		.features-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Feature card — scroll-triggered entrance */
	.feature-card {
		padding: 28px 24px;
		border-radius: 20px;
		opacity: 0;
		transform: translateY(20px);
		transition:
			opacity 400ms ease,
			transform 400ms ease;
	}

	:global(.feature-card.is-visible) {
		opacity: 1;
		transform: translateY(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.feature-card {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}

	.feature-icon-wrap {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		margin-bottom: 16px;
		border: 1px solid var(--sp-border);
	}

	.feature-icon-map {
		background: color-mix(in srgb, var(--sp-accent) 15%, transparent);
	}

	.feature-icon-chart {
		background: color-mix(in srgb, var(--sp-brand) 15%, transparent);
	}

	.feature-icon-ticket {
		background: color-mix(in srgb, var(--sp-gold) 15%, transparent);
	}

	.feature-icon {
		font-size: 20px;
		color: var(--sp-brand);
	}

	.feature-icon-map .feature-icon {
		color: var(--sp-accent);
	}

	.feature-icon-ticket .feature-icon {
		color: var(--sp-gold);
	}

	.feature-heading {
		font-family: var(--sp-font-display);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--sp-text);
		margin: 0 0 8px;
	}

	.feature-desc {
		font-size: 14px;
		line-height: 1.6;
		color: var(--sp-muted);
		margin: 0;
	}

	/* ── How It Works Section ──────────────────────────────────────── */
	.hiw-section {
		padding: 80px 0;
		background: var(--sp-bg0);
	}

	.hiw-steps {
		display: grid;
		grid-template-columns: 1fr;
		gap: 32px;
	}

	@media (min-width: 768px) {
		.hiw-steps {
			grid-template-columns: repeat(3, 1fr);
			gap: 0;
		}
	}

	.hiw-step {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 16px;
	}

	@media (min-width: 768px) {
		.hiw-step {
			padding: 0 24px;
		}

		.hiw-step:first-child {
			padding-left: 0;
		}

		.hiw-step:last-child {
			padding-right: 0;
		}
	}

	.hiw-step-num-wrap {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.hiw-step-num {
		width: 52px;
		height: 52px;
		border-radius: 16px;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--sp-brand) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--sp-brand) 30%, var(--sp-border));
		flex-shrink: 0;
	}

	.hiw-step-icon {
		font-size: 20px;
		color: var(--sp-brand);
	}

	/* Connecting line between steps (desktop only) */
	.hiw-connector {
		display: none;
	}

	@media (min-width: 768px) {
		.hiw-connector {
			display: block;
			flex: 1;
			height: 1px;
			background: linear-gradient(
				to right,
				color-mix(in srgb, var(--sp-brand) 40%, transparent),
				color-mix(in srgb, var(--sp-border) 60%, transparent)
			);
			margin-left: 12px;
		}
	}

	.hiw-step-body {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.hiw-step-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--sp-brand);
	}

	.hiw-step-title {
		font-family: var(--sp-font-display);
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--sp-text);
		margin: 0;
	}

	.hiw-step-desc {
		font-size: 14px;
		line-height: 1.6;
		color: var(--sp-muted);
		margin: 0;
	}

	/* ── Footer ────────────────────────────────────────────────────── */
	.site-footer {
		border-top: 1px solid var(--sp-border);
		padding: 24px 0;
		background: var(--sp-bg0);
	}

	.footer-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.footer-copy {
		font-size: 13px;
		color: var(--sp-muted);
		margin: 0;
	}

	.footer-links {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.footer-link {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-muted);
		text-decoration: none;
		transition: color 150ms ease;
	}

	.footer-link:hover {
		color: var(--sp-text);
	}

	.footer-link:focus-visible {
		outline: 2px solid color-mix(in srgb, var(--sp-accent) 70%, white);
		outline-offset: 2px;
		border-radius: 4px;
	}
</style>
