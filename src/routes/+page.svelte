<svelte:head>
	<title>Smart Park</title>
</svelte:head>

<div class="min-h-screen pb-8">
	<header class="sp-shell pt-16 sm:pt-6">
		<div class="sp-topbar sp-pop">
			<div class="flex items-center gap-3 min-w-0">
				<div
					class="h-10 w-10 rounded-2xl grid place-items-center font-extrabold"
					style="background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand)); color: #062112;"
				>
					SP
				</div>
				<div class="min-w-0">
					<div class="font-extrabold tracking-tight text-[15px] leading-tight">Smart Park</div>
					<div class="text-[12px] leading-tight" style="color: var(--sp-muted);">
						Pune parking map • instant booking • smart pricing
					</div>
				</div>
			</div>
			<nav class="flex items-center gap-2 sm:gap-3 max-sm:flex-col max-sm:items-stretch">
				<a class="sp-pill max-sm:w-full" href="/login">Sign in</a>
				<a class="sp-btn sp-btn-primary px-4 py-2.5 text-sm max-sm:w-full" href="/signup">Get started</a>
			</nav>
		</div>
	</header>

	<main class="sp-shell py-6 sm:py-10">
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
			<section class="sp-section sp-pop">
				<div class="inline-flex items-center gap-2 sp-btn px-3 py-1.5 text-xs font-extrabold">
					<span class="i-fa6-solid-bolt"></span>
					Now serving Pune
				</div>
				<h1 class="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.05]">
					Find parking faster. <span style="color: var(--sp-brand);">Pay smarter.</span>
				</h1>
				<p class="mt-4 text-base sm:text-lg" style="color: var(--sp-muted);">
					Live lot discovery + simulated realtime updates. Compare prices, reserve instantly, and
					earn XP for smart choices.
				</p>

				<div class="mt-6 flex flex-col sm:flex-row gap-3">
					<a class="sp-btn sp-btn-primary px-5 py-3 text-sm" href="/signup">Create account</a>
					<a class="sp-btn px-5 py-3 text-sm font-bold" href="/login">Go to dashboard</a>
				</div>

				<div class="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
					<div class="sp-kpi">
						<div class="text-xs" style="color: var(--sp-muted);">Live lots</div>
						<div class="mt-1 text-xl font-extrabold">Up to 90</div>
					</div>
					<div class="sp-kpi">
						<div class="text-xs" style="color: var(--sp-muted);">Updates</div>
						<div class="mt-1 text-xl font-extrabold">Every 3s</div>
					</div>
					<div class="sp-kpi">
						<div class="text-xs" style="color: var(--sp-muted);">Smart pricing</div>
						<div class="mt-1 text-xl font-extrabold">Dynamic</div>
					</div>
					<div class="sp-kpi">
						<div class="text-xs" style="color: var(--sp-muted);">XP rewards</div>
						<div class="mt-1 text-xl font-extrabold">Gamified</div>
					</div>
				</div>
			</section>

			<section class="sp-section sp-pop">
				<div class="text-sm font-extrabold">How it works</div>
				<div class="mt-4 grid gap-3">
					<div class="sp-glass rounded-2xl p-4">
						<div class="flex items-start gap-3">
							<div
								class="h-9 w-9 rounded-2xl grid place-items-center text-sm font-extrabold"
								style="background: color-mix(in srgb, var(--sp-accent) 22%, transparent); border: 1px solid var(--sp-border);"
							>
								<span class="i-fa6-solid-map-location-dot"></span>
							</div>
							<div class="min-w-0">
								<div class="font-bold">Discover lots</div>
								<div class="text-sm mt-0.5" style="color: var(--sp-muted);">
									We query OpenStreetMap Overpass for public parking amenities.
								</div>
							</div>
						</div>
					</div>

					<div class="sp-glass rounded-2xl p-4">
						<div class="flex items-start gap-3">
							<div
								class="h-9 w-9 rounded-2xl grid place-items-center text-sm font-extrabold"
								style="background: color-mix(in srgb, var(--sp-brand) 18%, transparent); border: 1px solid var(--sp-border);"
							>
								<span class="i-fa6-solid-chart-line"></span>
							</div>
							<div class="min-w-0">
								<div class="font-bold">Watch it change</div>
								<div class="text-sm mt-0.5" style="color: var(--sp-muted);">
									Live events simulate availability + AI-driven price surges.
								</div>
							</div>
						</div>
					</div>

					<div class="sp-glass rounded-2xl p-4">
						<div class="flex items-start gap-3">
							<div
								class="h-9 w-9 rounded-2xl grid place-items-center text-sm font-extrabold"
								style="background: color-mix(in srgb, var(--sp-warn) 18%, transparent); border: 1px solid var(--sp-border);"
							>
								<span class="i-fa6-solid-ticket"></span>
							</div>
							<div class="min-w-0">
								<div class="font-bold">Reserve by price</div>
								<div class="text-sm mt-0.5" style="color: var(--sp-muted);">
									Pick duration, compare price options, confirm, and download a receipt.
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	</main>
</div>
