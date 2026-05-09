<script lang="ts">
	let {
		message,
		onRetry
	}: {
		message: string;
		onRetry?: () => void;
	} = $props();
</script>

<div class="error-banner" role="alert" aria-live="assertive">
	<span class="i-fa6-solid-circle-exclamation error-icon" aria-hidden="true"></span>
	<span class="error-message">{message}</span>
	{#if onRetry}
		<button class="sp-btn error-retry" onclick={onRetry}>Retry</button>
	{/if}
</div>

<style>
	.error-banner {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		border-radius: 12px;
		border: 1px solid color-mix(in srgb, var(--sp-danger) 35%, var(--sp-border));
		background: color-mix(in srgb, var(--sp-danger) 8%, var(--sp-surface));
		color: var(--sp-text);
	}

	.error-icon {
		width: 16px;
		height: 16px;
		color: var(--sp-danger);
		flex-shrink: 0;
		display: block;
	}

	.error-message {
		flex: 1;
		font-size: 14px;
		font-weight: 500;
		color: color-mix(in srgb, var(--sp-danger) 80%, var(--sp-text));
		min-width: 0;
	}

	.error-retry {
		flex-shrink: 0;
		padding: 6px 12px;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		border-color: color-mix(in srgb, var(--sp-danger) 35%, var(--sp-border));
		color: var(--sp-danger);
	}

	.error-retry:hover {
		background: color-mix(in srgb, var(--sp-danger) 10%, var(--sp-surface));
	}
</style>
