<script lang="ts">
	import { page } from '$app/stores';
	import { superForm } from '$lib/index.js';
	import SuperDebug from '$lib/index.js';
	import { ProfileType } from './schema.js';
	// import type { UserProfileSchema } from './schema';
	export let data;

	const { form, errors, message, enhance, tainted, isTainted, constraints } = superForm(data.form, {
		dataType: 'json'
	});

	let yearTainted: boolean = isTainted($tainted?.typeData?.yearOfStudy);
	yearTainted;
</script>

<SuperDebug data={$form} />

<h3>Superforms testing ground - Zod</h3>

{#if $message}
	<!-- eslint-disable-next-line svelte/valid-compile -->
	<div class="status" class:error={$page.status >= 400} class:success={$page.status == 200}>
		{$message}
	</div>
{/if}

<form method="POST" use:enhance>
	<label>
		Name<br />
		<input name="name" aria-invalid={$errors.name ? 'true' : undefined} bind:value={$form.name} />
		{#if $errors.name}<span class="invalid">{$errors.name}</span>{/if}
	</label>

	<label>
		Email<br />
		<input
			name="email"
			type="email"
			aria-invalid={$errors.email ? 'true' : undefined}
			bind:value={$form.email}
		/>
		{#if $errors.email}<span class="invalid">{$errors.email}</span>{/if}
	</label>

	<label>
		Type
		<br />
		<select bind:value={$form.type}>
			<option value={ProfileType.STUDENT}>Student</option>
			<option value={ProfileType.FACULTY}>Faculty</option>
			<option value={ProfileType.STAFF}>Staff</option>
		</select>
	</label>
	<hr />

	{#if $form.type === ProfileType.STUDENT}
		<label>
			Year of Study<br />
			<input
				name="yearOfStudy"
				type="number"
				bind:value={$form.typeData.yearOfStudy}
				{...$constraints.typeData?.yearOfStudy}
			/>
			{#if $errors.typeData?.yearOfStudy}
				<p>
					{$errors.typeData?.yearOfStudy}
				</p>
			{/if}
		</label>
		<label>
			Branch<br />
			<input name="branch" type="text" bind:value={$form.typeData.branch} />
			{#if $errors.typeData?.branch}
				<p>
					{$errors.typeData.branch}
				</p>
			{/if}
		</label>
		<label>
			Department<br />
			<input name="department" type="text" bind:value={$form.typeData.department} />
			{#if $errors.typeData?.department}
				<p>
					{$errors.typeData?.department}
				</p>
			{/if}
		</label>
		<label>
			Student ID<br />
			<input name="studentId" type="text" bind:value={$form.typeData.studentId} />
			{#if $errors.typeData?.studentId}
				<p>
					{$errors.typeData?.studentId}
				</p>
			{/if}
		</label>
	{:else if $form.type === ProfileType.FACULTY}
		<label>
			Designation<br />
			<input name="designation" type="text" bind:value={$form.typeData.designation} />
			{#if $errors.typeData?.designation && $errors.typeData.designation.length}
				<p>
					{$errors.typeData?.designation}
				</p>
			{/if}
		</label>
		<label>
			Branch<br />
			<input name="branch" type="text" bind:value={$form.typeData.branch} />
			{#if $errors.typeData?.branch}
				<p>
					{$errors.typeData?.branch}
				</p>
			{/if}
		</label>
		<label>
			Department<br />
			<input name="department" type="text" bind:value={$form.typeData.department} />
			{#if $errors.typeData?.department}
				<p>
					{$errors.typeData?.department}
				</p>
			{/if}
		</label>
		<label>
			Faculty Id<br />
			<input name="facultyId" type="text" bind:value={$form.typeData.facultyId} />
			{#if $errors.typeData?.facultyId}
				<p>
					{$errors.typeData?.facultyId}
				</p>
			{/if}
		</label>
	{/if}

	<button>Submit</button>
</form>

<style>
	.invalid {
		color: red;
	}

	.status {
		color: white;
		padding: 4px;
		padding-left: 8px;
		border-radius: 2px;
		font-weight: 500;
	}

	.status.success {
		background-color: seagreen;
	}

	.status.error {
		background-color: #ff2a02;
	}

	input {
		background-color: #ddd;
	}

	hr {
		margin-top: 4rem;
	}

	form {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
