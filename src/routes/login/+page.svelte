<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let email = $state('');
	let redirectTo = $state('/dashboard');
	let submitting = $state(false);
	let emailError = $state('');
	let passwordError = $state('');

	$effect(() => {
		redirectTo = page.url.searchParams.get('redirectTo') ?? '/dashboard';
	});
</script>

<svelte:head>
	<title>Sign in | Smart Park</title>
</svelte:head>

<div class="auth-shell">
	<!-- Left brand panel (hidden on mobile) -->
	<div class="auth-brand">
		<!-- Logo -->
		<div class="auth-logo">
			<div class="auth-logo-mark">SP</div>
			<span class="auth-logo-name">Smart Park</span>
		</div>

		<!-- Tagline -->
		<div class="auth-brand-copy">
			<h2 class="auth-tagline">Park smarter.<br>Earn more.</h2>
			<p class="auth-desc">Live lot discovery, instant booking, and XP rewards for every smart choice.</p>
		</div>

		<!-- Parking lot SVG illustration -->
		<div class="auth-illustration">
			<svg viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img">
				<!-- Lot background -->
				<rect width="280" height="200" rx="12" fill="rgba(0,0,0,0.18)"/>
				<!-- Road lanes -->
				<rect x="0" y="88" width="280" height="24" fill="rgba(0,0,0,0.25)"/>
				<!-- Lane markings -->
				<rect x="20" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<rect x="60" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<rect x="100" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<rect x="140" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<rect x="180" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<rect x="220" y="98" width="20" height="4" rx="2" fill="rgba(255,255,255,0.3)"/>
				<!-- Top row: 5 spots -->
				{#each [16, 68, 120, 172, 224] as x, i}
					<rect {x} y="12" width="44" height="68" rx="6"
						fill={i === 1 || i === 3 ? 'rgba(255,255,255,0.12)' : 'rgba(34,197,94,0.35)'}
						stroke={i === 1 || i === 3 ? 'rgba(255,255,255,0.2)' : 'rgba(134,239,172,0.6)'}
						stroke-width="1.5"/>
					<!-- Spot number -->
					<text x={x + 22} y="52" text-anchor="middle" font-size="10" font-weight="700"
						fill={i === 1 || i === 3 ? 'rgba(255,255,255,0.4)' : 'rgba(134,239,172,0.9)'}>
						{i + 1}
					</text>
					<!-- Car silhouette in occupied spots -->
					{#if i === 1 || i === 3}
						<rect x={x + 6} y="22" width="32" height="48" rx="5" fill="rgba(255,255,255,0.15)"/>
						<rect x={x + 10} y="26" width="24" height="18" rx="3" fill="rgba(255,255,255,0.1)"/>
						<circle cx={x + 14} cy="66" r="5" fill="rgba(255,255,255,0.2)"/>
						<circle cx={x + 30} cy="66" r="5" fill="rgba(255,255,255,0.2)"/>
					{/if}
				{/each}
				<!-- Bottom row: 5 spots -->
				{#each [16, 68, 120, 172, 224] as x, i}
					<rect {x} y="120" width="44" height="68" rx="6"
						fill={i === 0 || i === 2 || i === 4 ? 'rgba(255,255,255,0.12)' : 'rgba(34,197,94,0.35)'}
						stroke={i === 0 || i === 2 || i === 4 ? 'rgba(255,255,255,0.2)' : 'rgba(134,239,172,0.6)'}
						stroke-width="1.5"/>
					<text x={x + 22} y="160" text-anchor="middle" font-size="10" font-weight="700"
						fill={i === 0 || i === 2 || i === 4 ? 'rgba(255,255,255,0.4)' : 'rgba(134,239,172,0.9)'}>
						{i + 6}
					</text>
					{#if i === 0 || i === 2 || i === 4}
						<rect x={x + 6} y="130" width="32" height="48" rx="5" fill="rgba(255,255,255,0.15)"/>
						<rect x={x + 10} y="134" width="24" height="18" rx="3" fill="rgba(255,255,255,0.1)"/>
						<circle cx={x + 14} cy="174" r="5" fill="rgba(255,255,255,0.2)"/>
						<circle cx={x + 30} cy="174" r="5" fill="rgba(255,255,255,0.2)"/>
					{/if}
				{/each}
			</svg>
		</div>

		<!-- Trust badges -->
		<div class="auth-trust-row">
			<div class="auth-trust-badge">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="7" stroke="rgba(134,239,172,0.8)" stroke-width="1.5"/>
					<path d="M5 8l2 2 4-4" stroke="rgba(134,239,172,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				<span>90+ live lots</span>
			</div>
			<div class="auth-trust-badge">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M8 2v4l2.5 2.5" stroke="rgba(134,239,172,0.8)" stroke-width="1.5" stroke-linecap="round"/>
					<circle cx="8" cy="8" r="6" stroke="rgba(134,239,172,0.8)" stroke-width="1.5"/>
				</svg>
				<span>Real-time updates</span>
			</div>
			<div class="auth-trust-badge">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<path d="M8 2l1.5 3.5 3.5.5-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" stroke="rgba(134,239,172,0.8)" stroke-width="1.5" stroke-linejoin="round"/>
				</svg>
				<span>Gamified rewards</span>
			</div>
		</div>
	</div>

	<!-- Right form panel -->
	<div class="auth-form">
		<div class="auth-form-card sp-pop">
			<div class="auth-form-header">
				<div class="auth-form-logo">
					<div
						class="h-10 w-10 rounded-2xl grid place-items-center font-extrabold text-sm"
						style="background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand)); color: #062112;"
					>
						SP
					</div>
					<div>
						<h1 class="text-2xl font-extrabold tracking-tight">Sign in</h1>
						<p class="text-sm mt-0.5" style="color: var(--sp-muted);">
							Continue your streak and manage your bookings.
						</p>
					</div>
				</div>
			</div>

			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
				class="auth-form-fields"
			>
				<input type="hidden" name="redirectTo" value={redirectTo} />

				<!-- Email field -->
				<div class="field-group">
					<label for="email" class="field-label">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						bind:value={email}
						class="sp-input"
						class:is-error={!!emailError}
						oninvalid={(e) => {
							e.preventDefault();
							emailError = (e.target as HTMLInputElement).validationMessage;
						}}
						oninput={() => { emailError = ''; }}
					/>
					{#if emailError}
						<p class="field-error">{emailError}</p>
					{/if}
				</div>

				<!-- Password field -->
				<div class="field-group">
					<label for="password" class="field-label">Password</label>
					<input
						id="password"
						name="password"
						type="password"
						autocomplete="current-password"
						required
						class="sp-input"
						class:is-error={!!passwordError}
						oninvalid={(e) => {
							e.preventDefault();
							passwordError = (e.target as HTMLInputElement).validationMessage;
						}}
						oninput={() => { passwordError = ''; }}
					/>
					{#if passwordError}
						<p class="field-error">{passwordError}</p>
					{/if}
				</div>

				<!-- Server-side error -->
				{#if page.form?.message}
					<p class="form-error-msg">{page.form.message}</p>
				{/if}

				<button
					type="submit"
					class="sp-btn sp-btn-primary w-full auth-submit-btn"
					disabled={submitting}
				>
					{#if submitting}
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="spinner" aria-hidden="true">
							<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="10" stroke-linecap="round"/>
						</svg>
						Signing in…
					{:else}
						Sign in
					{/if}
				</button>
			</form>

			<p class="auth-switch-link">
				Don't have an account?
				<a href="/signup">Create one</a>
			</p>
		</div>
	</div>
</div>

<style>
	.auth-shell {
		min-height: 100svh;
		display: grid;
		grid-template-columns: 1fr;
	}
	@media (min-width: 768px) {
		.auth-shell {
			grid-template-columns: 45fr 55fr;
		}
	}

	.auth-brand {
		display: none;
		background: linear-gradient(135deg, var(--sp-brand) 0%, color-mix(in srgb, var(--sp-brand) 60%, #000) 100%);
		color: #fff;
		padding: 48px 40px;
		flex-direction: column;
		gap: 32px;
		position: relative;
		overflow: hidden;
	}
	@media (min-width: 768px) {
		.auth-brand {
			display: flex;
		}
	}

	.auth-logo {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.auth-logo-mark {
		width: 44px;
		height: 44px;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.15);
		border: 1.5px solid rgba(255, 255, 255, 0.3);
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 15px;
		letter-spacing: -0.02em;
		color: #fff;
		backdrop-filter: blur(8px);
	}
	.auth-logo-name {
		font-weight: 700;
		font-size: 18px;
		letter-spacing: -0.02em;
		color: rgba(255, 255, 255, 0.95);
	}

	.auth-brand-copy {
		flex: 0 0 auto;
	}
	.auth-tagline {
		font-size: 32px;
		font-weight: 800;
		line-height: 1.15;
		letter-spacing: -0.03em;
		color: #fff;
		margin: 0 0 12px;
	}
	.auth-desc {
		font-size: 15px;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.75);
		margin: 0;
	}

	.auth-illustration {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
	}
	.auth-illustration svg {
		width: 100%;
		max-width: 300px;
		height: auto;
		border-radius: 12px;
		filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.3));
	}

	.auth-trust-row {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.auth-trust-badge {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 13px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.85);
	}

	/* Right panel */
	.auth-form {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 24px;
		background: var(--sp-bg0);
		min-height: 100svh;
	}
	@media (min-width: 768px) {
		.auth-form {
			min-height: auto;
			padding: 48px 40px;
		}
	}

	.auth-form-card {
		width: 100%;
		max-width: 420px;
		background: var(--sp-surface-strong);
		border: 1px solid var(--sp-border);
		border-radius: 20px;
		padding: 32px;
		box-shadow: 0 12px 40px rgba(2, 8, 23, 0.08);
	}

	.auth-form-header {
		margin-bottom: 28px;
	}
	.auth-form-logo {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.auth-form-fields {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.field-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--sp-muted);
	}
	.field-error {
		font-size: 12px;
		font-weight: 500;
		color: var(--sp-danger);
		margin: 0;
	}

	.form-error-msg {
		font-size: 13px;
		font-weight: 500;
		color: var(--sp-danger);
		background: color-mix(in srgb, var(--sp-danger) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--sp-danger) 20%, transparent);
		border-radius: 10px;
		padding: 10px 14px;
		margin: 0;
	}

	.auth-submit-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 20px;
		font-size: 14px;
		font-weight: 700;
		cursor: pointer;
	}
	.auth-submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.auth-switch-link {
		margin-top: 20px;
		font-size: 13px;
		color: var(--sp-muted);
		text-align: center;
	}
	.auth-switch-link a {
		font-weight: 700;
		color: var(--sp-brand);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.auth-switch-link a:hover {
		color: var(--sp-brand-2);
	}
</style>
