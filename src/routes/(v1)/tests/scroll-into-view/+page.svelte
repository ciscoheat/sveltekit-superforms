<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	import type { PageData } from './$types.js';

	export let data: PageData;

	const { form, errors, message, enhance } = superForm(data.form, {
		scrollToError: { behavior: 'smooth', block: 'center', inline: 'center' },
		taintedMessage: null
	});

	let nameField: HTMLInputElement;
	let isVisible = false;

	function checkVisible() {
		if (isElementInViewport(nameField)) isVisible = true;
	}

	// Thanks to https://stackoverflow.com/a/7557433
	function isElementInViewport(el: Element) {
		var rect = el.getBoundingClientRect();

		return (
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <=
				(window.innerHeight || document.documentElement.clientHeight) /* or $(window).height() */ &&
			rect.right <=
				(window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
		);
	}
</script>

<div>Visible: {isVisible}</div>

<div class="scroller" on:scroll={checkVisible}>
	{#if $message}<h4>{$message}</h4>{/if}

	<form method="POST" use:enhance>
		<div>
			<button id="submit">Submit</button>
		</div>
		<label>
			Name: <input
				bind:this={nameField}
				name="name"
				id="name"
				aria-invalid={$errors.name ? 'true' : undefined}
				bind:value={$form.name}
			/>
			{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
		</label>
	</form>
</div>

<style lang="scss">
	.scroller {
		height: 300px;
		overflow: scroll;
	}

	form {
		margin: 2rem 0;

		label {
			margin: 1000px 1000px;
			padding: 500px;
		}

		input {
			background-color: #dedede;
		}

		.invalid {
			color: crimson;
		}
	}
</style>
