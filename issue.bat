pushd src\routes\(v2)\v2\%1
sed -i "s#'sveltekit-superforms'#'$lib/index.js'#g" *.*
sed -i -E "s#import \{ ([a-z]+) \} from 'sveltekit-superforms/adapters'#import { \1 } from '$lib/adapters/\1.js'#g" *.*
sed -i -E "s#import \{ ([a-z]+)Client \} from 'sveltekit-superforms/adapters'#import { \1Client } from '$lib/adapters/\1.js'#g" *.*
popd
