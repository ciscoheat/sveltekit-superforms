pushd src\routes\(v2)\v2\%1 || EXIT /B 1
rm +layout.svelte
grep -rl . | xargs sed -i "s#'sveltekit-superforms'#'$lib/index.js'#g"
grep -rl . | xargs sed -i -E "s#import \{ ([a-z]+) \} from 'sveltekit-superforms/adapters'#import { \1 } from '$lib/adapters/\1.js'#g"
grep -rl . | xargs sed -i -E "s#import \{ ([a-z]+)Client \} from 'sveltekit-superforms/adapters'#import { \1Client } from '$lib/adapters/\1.js'#g"
popd
