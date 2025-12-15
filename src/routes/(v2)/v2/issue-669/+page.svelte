<script lang="ts">
	import { defaults, superForm } from '$lib/index.js';
	import { zod } from '$lib/adapters/zod4.js';
	import { z } from 'zod';

	const schema = z.object({ name: z.string().min(1) });

	const form = superForm(defaults({ name: '' }, zod(schema)), {
		SPA: true,
		customValidity: true,
		validators: zod(schema)
	});

	const { validateForm } = form;
	validateForm({ update: true });
</script>
