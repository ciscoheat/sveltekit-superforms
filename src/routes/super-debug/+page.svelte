<script>
    import { page } from '$app/stores';
    import { superForm } from '$lib/client';
    import SuperDebug from '$lib/client/SuperDebug.svelte';
    import { onMount } from 'svelte';

    export let data;
    /**
     * @type {any}
     */
    let someUnknownData;
    const emptyObject = {};
    const promiseNeverCameTrue = new Promise((resolve, reject) => {
        setTimeout(() => resolve({}), 5000)
    })
    /**
     * @type {() => any}
     */
    let promiseProduct = () => {}
    const someObject = {
        full_name: "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr."
    }

    const { form } = superForm(data.form);

    $form.full_name = "Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr."

    onMount(async () => {
        // Put fetch inside onMount so svelte would stop gawking at us.
        promiseProduct = async () => {
            const response = await fetch('https://dummyjson.com/products/1')
            const body = await response.json()
            return body
        }
    })
</script>

<main class="space-y-4">
    <section>
        <h4>Super Debug with label</h4>
        <p>Label is useful when using multiple instance of SuperDebug.</p>
        <SuperDebug label="Sample User" data={$form} />
    </section>
    <section>
        <h4>Super Debug without status</h4>
        <SuperDebug label="Sample User" status={false} data={$form} />
    </section>
    <section>
        <h4>Super Debug without label</h4>
        <p>This is SuperDebug's classic layout. Make sure we don't have weird spaces when there is no label.</p>
        <SuperDebug data={$form} />
    </section>
    <section>
        <h4>Super Debug without label and status</h4>
        <SuperDebug data={$form} status={false} />
    </section>
    <section>
        <h4>Super Debug with label and undefined data</h4>
        <p>Do not hide output from <code>syntaxHighlight</code> even when the result is undefined. In JavaScript it is a crucial piece of information.</p>
        <SuperDebug label="Data not ready" data={someUnknownData} />
    </section>
    <section>
        <h4>Super Debug without label and undefined data</h4>
        <p>There are cases when the data is not readily available on page load. Make sure SuperDebug layout does not break on itself.</p>
        <SuperDebug data={someUnknownData} />
    </section>
    <section>
        <h4>Super Debug with empty object</h4>
        <SuperDebug data={emptyObject} />
    </section>
    <section class="space-y-4">
        <h4>Super Debug promise support</h4>
        <p>Fancy way of loading things for fancy people. Try reloading the page to see it in action. Right now when waiting for promise a message that says "Loading data" appears. Having a named slot for customization is nice but it is trivial.</p>
        <pre><code>{@html `let promiseNeverCameTrue = new Promise((resolve, reject) => {
    setTimeout(() => resolve({}), 5000)
})`}
{@html "&lt;SuperDebug promise={true} data={promiseNeverCameTrue} /&gt;"}</code></pre>
        <SuperDebug promise={true} data={promiseNeverCameTrue} />
        <pre><code>{@html `let promiseProduct = async () => {
    const response = await fetch('https://dummyjson.com/products/1')
    const body = await response.json()
    return body
}`}
{@html `&lt;SuperDebug label="Dummyjson product" promise={true} data={promiseProduct()} /&gt;`}</code></pre>
        <SuperDebug label="Dummyjson product" promise={true} data={promiseProduct()} />
    </section>
    <section class="space-y-4">
        <h4>Super Debug using promise on non-promise related data</h4>
        <p>To see this in action, slightly scroll above near Dummyjson product and hit refresh.</p>
        <ul style="list-style-type: none;">
            <li>ChadDev: <b>No one can stop me from enabling promise because I can't read.</b></li>
            <li>SuperForm: Hey, that's illegal!</li>
            <li>ChadDev: It works!</li>
        </ul>
        <SuperDebug label="Promisify $form" promise={true} data={someObject} />
    </section>
    <section>
        <h4>Super Debug displaying $page data</h4>
        <p>Svelte's <code>$page</code> data in all its glory.</p>
        <SuperDebug label="$page data" data={$page} />
    </section>
</main>

<style>
    :global(.space-y-4 > * + *) {
        margin-top: 1rem;
    }
</style>