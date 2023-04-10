<script lang="ts">
  import type { Writable } from 'svelte/store';

  export let field: Writable<string>;
  export let name: string;
</script>

<label>
  <span>{name}</span><br />
  <input type="text" {name} bind:value={$field} {...$$restProps} />
</label>
