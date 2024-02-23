<script lang="ts">
	import { superForm } from '$lib/client/index.js';
	//import { zod } from '$lib/adapters/zod.js'
	//import { schema } from './schema.js';
	import FormCmptAge from './FormCmptAge.svelte';

	export let data;

	const form = superForm(data.form, {
		taintedMessage: false
		//dataType: 'json',
		//validators: zod(schema)
	});
</script>

<FormCmptAge {form} field="age" />
<FormCmptAge {form} field="homePlanet" />
