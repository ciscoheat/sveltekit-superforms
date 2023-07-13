<script>
  import { page } from '$app/stores';
  import { superForm } from '$lib/client';
  import SuperDebug from '$lib/client/SuperDebug.svelte';
  import { onMount } from 'svelte';
  import { readable } from 'svelte/store';

  export let data;

  const bigSForm = superForm(data.bigForm);
  const bigForm = bigSForm.form;
  $bigForm.full_name =
    'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.';

  const { form } = superForm(data.form);

  $form.full_name = 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.';

  /** @type {unknown} */
  let someUnknownData;
  const emptyObject = {};

  const someObject = {
    full_name: 'Hubert Blaine Wolfeschlegelsteinhausenbergerdorff Sr.'
  };
  const promiseNeverCameTrue = new Promise((_, reject) => {
    setTimeout(() => reject('Rejected'), 5000);
  });

  /** @type {() => Promise<unknown>} */
  let promiseProduct = async () => ({});

  onMount(async () => {
    // Put fetch inside onMount so svelte would stop gawking at us.
    promiseProduct = async () => {
      const response = await fetch('https://dummyjson.com/products/1');
      const body = await response.json();
      return body;
    };
  });

  const promiseStore = readable(
    /** @type {Promise<number>}*/ (/** @type {any}*/ (undefined)),
    (set, update) => {
      let count = 0;
      /** @type {ReturnType<typeof setTimeout> | undefined}*/
      let timeoutId;

      set(
        new Promise((resolve, reject) => {
          timeoutId = setTimeout(() => {
            timeoutId = undefined;
            resolve(count++);
          }, 1000);
        })
      );

      const interval = setInterval(() => {
        update(
          (_) =>
            new Promise((resolve, reject) => {
              timeoutId = setTimeout(() => {
                timeoutId = undefined;
                resolve(count++);
              }, 1000);
            })
        );
      }, 5000);

      return () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
        }
        clearInterval(interval);
      };
    }
  );
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
    <p>
      This is SuperDebug's classic layout. Make sure we don't have weird
      spaces when there is no label.
    </p>
    <SuperDebug data={$form} />
  </section>
  <section>
    <h4>Super Debug without label and status</h4>
    <SuperDebug data={$form} status={false} />
  </section>
  <section>
    <h4>Super Debug with label and undefined data</h4>
    <p>
      Do not hide output from <code>syntaxHighlight</code> even when the result
      is undefined. In JavaScript it is a crucial piece of information.
    </p>
    <SuperDebug label="Data not ready" data={someUnknownData} />
  </section>
  <section>
    <h4>Super Debug without label and undefined data</h4>
    <p>
      There are cases when the data is not readily available on page load.
      Make sure SuperDebug layout does not break on itself.
    </p>
    <SuperDebug data={someUnknownData} />
  </section>
  <section>
    <h4>Super Debug with empty object</h4>
    <SuperDebug data={emptyObject} />
  </section>
  <section class="space-y-4">
    <h4>Super Debug promise support</h4>
    <p>
      Fancy way of loading things for fancy people. Try reloading the page to
      see it in action. Right now when waiting for promise a message that
      says "Loading data" appears. Having a named slot for customization is
      nice but it is trivial.
    </p>
    <pre><code
        >{@html `let promiseNeverCameTrue = new Promise((resolve, reject) => {
    setTimeout(() => resolve({}), 5000)
})`}
{@html '&lt;SuperDebug promise={true} data={promiseNeverCameTrue} /&gt;'}</code
      ></pre>
    <SuperDebug promise={true} data={promiseNeverCameTrue} />
    <pre><code
        >{@html `let promiseProduct = async () => {
    const response = await fetch('https://dummyjson.com/products/1')
    const body = await response.json()
    return body
}`}
{@html `&lt;SuperDebug label="Dummyjson product" promise={true} data={promiseProduct()} /&gt;`}</code
      ></pre>
    <SuperDebug
      label="Dummyjson product"
      promise={true}
      data={promiseProduct()}
    />
  </section>
  <section class="space-y-4">
    <h4>Super Debug using promise on non-promise related data</h4>
    <p>
      To see this in action, slightly scroll above near Dummyjson product and
      hit refresh.
    </p>
    <ul style="list-style-type: none;">
      <li>
        ChadDev: <b
          >No one can stop me from enabling promise because I can't read.</b
        >
      </li>
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

  <section>
    <h4>Super Debug loves stores</h4>
    <p>Why not to pass a store directly.</p>
    <label for="form_full_name">
      <span>Full Name</span>
      <input id="form_full_name" bind:value={$bigForm.full_name} />
    </label>
    <SuperDebug data={bigSForm.form} label="Auto detected store" />
    <p style:margin-top="1em">
      Or maybe you want to see the store literal value instead of the store
      itself. SuperDebug has you covered.
    </p>
    <p>
      For this use the <code>raw</code> and <code>functions</code> props.
    </p>
    <SuperDebug
      data={bigSForm.errors}
      label="Literal Store value"
      raw
      functions
    />
  </section>

  <section>
    <h4>Super Debug loves stores x2</h4>
    <p>Does superform handle stores of promises?, Yep its cool.</p>
    <SuperDebug data={promiseStore} label="Store of promises" />
  </section>

  <section>
    <h4>Super Debug custom styling 😎</h4>
    <p>Bugs are easier to solve if they look familiar.</p>
    <SuperDebug data={$form} label="VS Code like theme" theme="vscode" />
    <p
      style:margin-top="1em"
      style:padding-left="4px"
      style:background-color="#1f1f1f0f"
    >
      <strong>Note:</strong> styling the component produces the side-effect
      described at the
      <a
        href="https://svelte.dev/docs/component-directives#style-props"
        target="_blank">Svelte docs</a
      >.
    </p>
  </section>
</main>

<style>
  :global(.space-y-4 > * + *) {
    margin-top: 1rem;
  }
</style>
