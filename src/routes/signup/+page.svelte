<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';

	let email = $state('');
</script>

<svelte:head>
	<title>Create account | Smart Park</title>
</svelte:head>

<div class="min-h-[calc(100vh-0px)] flex items-center justify-center p-6">
	<div class="w-full max-w-md sp-card p-6 sm:p-8 sp-pop">
		<div class="mb-6">
			<div class="flex items-center gap-3">
				<div
					class="h-10 w-10 rounded-2xl grid place-items-center font-extrabold"
					style="background: linear-gradient(180deg, var(--sp-brand-2), var(--sp-brand)); color: #062112;"
				>
					SP
				</div>
				<div class="min-w-0">
					<h1 class="text-2xl font-extrabold tracking-tight">Create account</h1>
					<p class="text-sm mt-0.5" style="color: var(--sp-muted);">
						Unlock quests, earn XP, and reserve smarter.
					</p>
				</div>
			</div>
		</div>

		<form method="POST" use:enhance class="space-y-4">
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
					autocomplete="new-password"
					required
					minlength="8"
					class="w-full sp-btn px-4 py-3 text-sm outline-none"
				/>
				<p class="text-xs" style="color: var(--sp-muted);">Minimum 8 characters.</p>
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
				Create account
			</button>
		</form>

		<div class="mt-6 text-sm" style="color: var(--sp-muted);">
			Already have an account?
			<a class="font-extrabold underline" href="/login">Sign in</a>
		</div>
	</div>
</div>
