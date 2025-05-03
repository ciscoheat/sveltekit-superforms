<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { VERSION } from 'svelte/compiler';
	import SuperDebugLegacy from './SuperDebugLegacy.svelte';
	import SuperDebugRuned from './SuperDebugRuned.svelte';

	export let props: ComponentProps<SuperDebugLegacy> | ComponentProps<typeof SuperDebugRuned>;
</script>


{#if VERSION[0] == '3' || VERSION[0] == '4'}
	<SuperDebugLegacy {...props} />
{:else}
	<SuperDebugRuned {...props} />
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
