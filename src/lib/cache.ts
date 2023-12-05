type CacheKeys = [object, ...object[]];

export class WeakMapCache<T> {
	private cache = new WeakMap();

	get<T2 = T>(key: CacheKeys) {
		return this.getCache<T2>(key);
	}

	/*
  delete(key: CacheKeys): boolean {
    return this.cache.delete(key[0]);
  }
  set(key: CacheKeys, value: object): this {
    throw new Error("Method not implemented.");
  }
  */

	private getCache<T2 = T>(keys: CacheKeys): { data?: T2; set: (obj: T2) => T2 } {
		keys = [...keys];
		const lastKey = keys.pop();
		if (!lastKey) throw new Error('Undefined WeakMapCache key.');

		let current = this.cache;
		while (keys.length) {
			const key = keys.shift();
			if (!key) throw new Error('Undefined WeakMapCache key.');

			if (!current.has(key)) {
				current.set(key, new WeakMap());
			}

			current = current.get(key);
		}

		const set = (obj: T2) => {
			current.set(lastKey, obj);
			return obj;
		};

		return current.has(lastKey) ? { data: current.get(lastKey), set } : { set };
	}
}
