/*
  Deep clones all properties except functions

  var arr = [1, 2, 3];
  var subObj = {aa: 1};
  var obj = {a: 3, b: 5, c: arr, d: subObj};
  var objClone = clone(obj);
  arr.push(4);
  subObj.bb = 2;
  obj; // {a: 3, b: 5, c: [1, 2, 3, 4], d: {aa: 1}}
  objClone; // {a: 3, b: 5, c: [1, 2, 3], d: {aa: 1, bb: 2}}
*/

export function clone<T>(obj: T): T {
	const type = {}.toString.call(obj).slice(8, -1);
	if (type == 'Set') {
		// @ts-expect-error Known type
		return new Set([...obj].map((value) => clone(value)));
	}
	if (type == 'Map') {
		// @ts-expect-error Known type
		return new Map([...obj].map((kv) => [clone(kv[0]), clone(kv[1])]));
	}
	if (type == 'Date') {
		// @ts-expect-error Known type
		return new Date(obj.getTime());
	}
	if (type == 'RegExp') {
		// @ts-expect-error Known type
		return RegExp(obj.source, (obj as RegExp).flags);
	}
	if (type == 'Array' || type == 'Object') {
		const result = type == 'Object' ? Object.create(Object.getPrototypeOf(obj)) : [];

		for (const key in obj) {
			result[key] = clone(obj[key]);
		}

		return result;
	}

	// primitives and non-supported objects (e.g. functions) land here
	return obj;
}
