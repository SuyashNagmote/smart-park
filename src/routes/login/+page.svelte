<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let email = $state('');
	let redirectTo = $state('/dashboard');

	$effect(() => {
		redirectTo = page.url.searchParams.get('redirectTo') ?? '/dashboard';
	});
</script>

<svelte:head>
	<title>Sign in | Smart Park</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center px-4 py-18 sm:p-6">
	<div class="w-full max-w-md sp-card p-5 sm:p-8 sp-pop">
		<div class="mb-6">
			<div class="flex items-center gap-3">
				<div
					class="h-10 w-10 rounded-2xl grid place-items-center font-extrabold"
					style="background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand)); color: #062112;"
				>
					SP
				</div>
				<div class="min-w-0">
					<h1 class="text-2xl font-extrabold tracking-tight">Sign in</h1>
					<p class="text-sm mt-0.5" style="color: var(--sp-muted);">
						Continue your streak and manage your bookings.
					</p>
				</div>
			</div>
		</div>

		<form method="POST" use:enhance class="space-y-4">
			<input type="hidden" name="redirectTo" value={redirectTo} />

			<div class="space-y-1">
				<label for="email" class="text-sm font-bold" style="color: var(--sp-muted);">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					bind:value={email}
					class="w-full sp-btn px-4 py-3 text-sm outline-none"
				/>
			</div>

			<div class="space-y-1">
				<label for="password" class="text-sm font-bold" style="color: var(--sp-muted);">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full sp-btn px-4 py-3 text-sm outline-none"
				/>
			</div>

			{#if page.form?.message}
				<div class="sp-glass rounded-2xl px-4 py-3 text-sm" style="color: var(--sp-danger);">
					{page.form.message}
				</div>
			{/if}

			<button
				type="submit"
				class="w-full sp-btn sp-btn-primary py-3 text-sm"
			>
				Sign in
			</button>
		</form>

		<div class="mt-6 text-sm" style="color: var(--sp-muted);">
			Don’t have an account?
			<a class="font-extrabold underline" href="/signup">Create one</a>
		</div>
	</div>
</div>
