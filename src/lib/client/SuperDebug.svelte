<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { VERSION } from 'svelte/compiler';
	import SuperDebugLegacy from './SuperDebugLegacy.svelte';
	import SuperDebugRuned from './SuperDebugRuned.svelte';

	type $$Props = ComponentProps<typeof SuperDebugRuned>;

	export let data: $$Props['data'];
</script>

{#if VERSION.startsWith('3') || VERSION.startsWith('4')}
	<SuperDebugLegacy {data} {...$$restProps} />
{:else}
	<SuperDebugRuned {data} {...$$restProps} />
{/if}

<!--
  @component

  SuperDebug is a debugging component that gives you colorized and nicely formatted output for any data structure, usually $form.
  
  Other use cases includes debugging plain objects, promises, stores and more.

  More info: https://superforms.rocks/super-debug
  
  **Short example:**

  ```svelte
  <script>
    import SuperDebug from 'sveltekit-superforms';
    import { superForm } from 'sveltekit-superforms';

    export let data;
    
    const { errors, form, enhance } = superForm(data.form);
  </script>
  
  <SuperDebug data={$form} label="My form data" />
  ```
-->
