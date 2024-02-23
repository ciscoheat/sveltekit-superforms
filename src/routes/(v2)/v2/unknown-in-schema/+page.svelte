<script lang="ts">
	import { defaults, superForm } from '$lib/client/index.js';
	import { zod } from '$lib/adapters/zod.js';
	import { userSchema } from './schema.js';
	import FormCmptAge from './FormCmptAge.svelte';

	export let data;

	const form = superForm(data.form, { taintedMessage: false });
	const anyForm = superForm(data.anyForm, { taintedMessage: false });

	const formValidated = defaults(zod(userSchema));
	const options: unknown[] = formValidated.data.options;
	console.log(options.length);
</script>

<FormCmptAge {form} field="age" />
<FormCmptAge {form} field="homePlanet" />
<FormCmptAge form={anyForm} field="age" />
