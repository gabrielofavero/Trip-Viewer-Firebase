export class BiMap<K = any, V = any> {
	private keyToValue: Map<K, V>;
	private valueToKey: Map<V, K>;

	constructor() {
		this.keyToValue = new Map<K, V>();
		this.valueToKey = new Map<V, K>();
	}

	set(key: K, value: V): void {
		this.keyToValue.set(key, value);
		this.valueToKey.set(value, key);
	}

	getByKey(key: K): V | undefined {
		return this.keyToValue.get(key);
	}

	getByValue(value: V): K | undefined {
		return this.valueToKey.get(value);
	}

	deleteByKey(key: K): void {
		const value = this.keyToValue.get(key);
		this.keyToValue.delete(key);
		if (value !== undefined) this.valueToKey.delete(value);
	}

	deleteByValue(value: V): void {
		const key = this.valueToKey.get(value);
		this.valueToKey.delete(value);
		if (key !== undefined) this.keyToValue.delete(key);
	}
}
