<script lang="ts">
	import CmptWithGeneric from './cmpt-with-generic.svelte';
</script>

<h1>Let's reproduce an issue here</h1>

<form method="POST">
	<CmptWithGeneric name="email" />
</form>
