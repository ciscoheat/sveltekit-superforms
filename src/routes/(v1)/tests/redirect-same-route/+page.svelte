<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';
	import SuperDebug from '$lib/client/SuperDebug.svelte';

	export let data: PageData;

	let shouldCancel = false;

	const { form, errors, tainted, message, enhance, submitting, delayed } = superForm(data.form, {
		onSubmit({ cancel }) {
			if (shouldCancel) cancel();
		}
	});
</script>

<SuperDebug data={{ $form, $errors, $tainted }} />

{#if $message}<h4>{$message}</h4>{/if}

<form method="POST" use:enhance>
	<label>
		Name: <input name="name" bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>
	<div class="toolbar">
		<button>Submit</button>
		{#if $submitting}
			<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
				><style>
					.spinner_ajPY {
						transform-origin: center;
						animation: spinner_AtaB 0.75s infinite linear;
					}
					@keyframes spinner_AtaB {
						100% {
							transform: rotate(360deg);
						}
					}
				</style><path
					d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
					opacity=".25"
				/><path
					d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
					class="spinner_ajPY"
				/></svg
			>
		{/if}
		{#if $delayed}
			<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
				><style>
					.spinner_nOfF {
						animation: spinner_qtyZ 2s cubic-bezier(0.36, 0.6, 0.31, 1) infinite;
					}
					.spinner_fVhf {
						animation-delay: -0.5s;
					}
					.spinner_piVe {
						animation-delay: -1s;
					}
					.spinner_MSNs {
						animation-delay: -1.5s;
					}
					@keyframes spinner_qtyZ {
						0% {
							r: 0;
						}
						25% {
							r: 3px;
							cx: 4px;
						}
						50% {
							r: 3px;
							cx: 12px;
						}
						75% {
							r: 3px;
							cx: 20px;
						}
						100% {
							r: 0;
							cx: 20px;
						}
					}
				</style><circle class="spinner_nOfF" cx="4" cy="12" r="3" /><circle
					class="spinner_nOfF spinner_fVhf"
					cx="4"
					cy="12"
					r="3"
				/><circle class="spinner_nOfF spinner_piVe" cx="4" cy="12" r="3" /><circle
					class="spinner_nOfF spinner_MSNs"
					cx="4"
					cy="12"
					r="3"
				/></svg
			>
		{/if}
	</div>
	<input type="checkbox" bind:checked={shouldCancel} /> Cancel submit
</form>

<style lang="scss">
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	form {
		margin: 2rem 0;

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
