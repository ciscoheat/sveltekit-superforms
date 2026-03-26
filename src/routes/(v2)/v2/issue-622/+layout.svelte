<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();
</script>

<p>Navigation</p>
<ul>
	<li><a href="/v2/issue-622/good?start">Good</a></li>
	<li><a href="/v2/issue-622/bad?start">Bad</a></li>
	<li>
		<a href="/v2/issue-622/bad-with-workaround?start"
			>Bad with workaround (timeoutMs > action delay)</a
		>
	</li>
</ul>

<p>Page id: {page.route.id}</p>
{@render children()}
