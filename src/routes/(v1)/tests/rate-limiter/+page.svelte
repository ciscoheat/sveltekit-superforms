<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData, Snapshot } from './$types.js';
	import { getFlash } from 'sveltekit-flash-message/client';
	import { page } from '$app/stores';

	export let data: PageData;

	const flash = getFlash(page);
	const { form, errors, enhance } = superForm(data.form, {
		resetForm: true,
		taintedMessage: null,
		stickyNavbar: '#nav',
		clearOnSubmit: 'none'
	});

	let formData = {
		name: $form.name,
		email: $form.email,
		subject: $form.subject,
		message: $form.message
	};

	export const snapshot: Snapshot = {
		capture: () => formData,
		restore: (value) => (formData = value)
	};

	$: if ($flash) {
		console.log('Toast', $flash.type, $flash.message);
	}
</script>

<form
	class="mt-4 transition-all"
	method="POST"
	action="?/contact"
	use:enhance
	class:!mt-5={$errors.name}
>
	<div class="form-item relative mb-5 mt-2">
		<input
			id="name"
			name="name"
			placeholder="Name"
			type="text"
			bind:value={$form.name}
			class="peer input my-2 block w-full !rounded-md bg-transparent px-4 text-sm text-secondary placeholder-secondary shadow-md outline outline-2 outline-secondary/20 backdrop-blur-sm transition-all focus-visible:outline-[2.5px] focus-visible:outline-neutral"
			class:!outline-red-500={$errors.name}
		/>
		{#if $errors.name}
			<label
				class="absolute left-2.5 top-[18px] z-10 px-[10px] text-[12px] font-bold text-secondary transition-all peer-valid:top-[-9px] peer-valid:bg-primary peer-focus-visible:top-[-9px] peer-focus-visible:bg-primary"
				for="name"
			>
				<span class="text-red-500">{$errors?.name}</span>
			</label>
		{/if}
	</div>
	<div class="form-item relative mb-5 mt-2">
		<input
			id="email"
			name="email"
			placeholder="Email"
			type="text"
			bind:value={$form.email}
			class="peer input my-2 block w-full !rounded-md bg-transparent px-4 text-sm text-secondary placeholder-secondary shadow-md outline outline-2 outline-secondary/20 backdrop-blur-sm transition-all focus-visible:outline-[2.5px] focus-visible:outline-neutral"
			class:!outline-red-500={$errors.email}
		/>
		{#if $errors.email}
			<label
				class="absolute left-2.5 top-[18px] z-10 px-[10px] text-[12px] font-bold text-secondary transition-all peer-valid:top-[-9px] peer-valid:bg-primary peer-focus-visible:top-[-9px] peer-focus-visible:bg-primary"
				for="email"
			>
				<span class="text-red-500">{$errors.email[0]}</span>
			</label>
		{/if}
	</div>
	<div class="form-item relative mb-5 mt-2">
		<input
			id="subject"
			name="subject"
			placeholder="Subject"
			type="text"
			bind:value={$form.subject}
			class="peer input my-2 block w-full !rounded-md bg-transparent px-4 text-sm text-secondary placeholder-secondary shadow-md outline outline-2 outline-secondary/20 backdrop-blur-sm transition-all focus-visible:outline-[2.5px] focus-visible:outline-neutral"
			class:!outline-red-500={$errors.subject}
		/>
		{#if $errors.subject}
			<label
				class="absolute left-2.5 top-[18px] z-10 px-[10px] text-[12px] font-bold text-secondary transition-all peer-valid:top-[-9px] peer-valid:bg-primary peer-focus-visible:top-[-9px] peer-focus-visible:bg-primary"
				for="subject"
			>
				<span class="text-red-500">{$errors.subject}</span>
			</label>
		{/if}
	</div>
	<div class="form-item relative mb-5 mt-2">
		<textarea
			id="message"
			name="message"
			placeholder="Message"
			bind:value={$form.message}
			class="peer textarea my-2 block w-full resize-none !rounded-md bg-transparent px-4 pt-3 text-sm text-secondary placeholder-secondary shadow-md outline outline-2 outline-secondary/20 backdrop-blur-sm transition-all focus-visible:outline-[2.5px] focus-visible:outline-neutral"
			class:!outline-red-500={$errors.message}
			rows="5"
		></textarea>
		{#if $errors.message}
			<label
				class="absolute left-2.5 top-[18px] z-10 px-[10px] text-[12px] font-bold text-secondary transition-all peer-valid:top-[-9px] peer-valid:bg-primary peer-focus-visible:top-[-9px] peer-focus-visible:bg-primary"
				for="message"
			>
				<span class="text-red-500">{$errors.message}</span>
			</label>
		{/if}
	</div>
	<button>Send</button>
</form>
