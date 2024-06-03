class BiMap {
  constructor() {
    this.keyToValue = new Map();
    this.valueToKey = new Map();
  }

  set(key, value) {
    this.keyToValue.set(key, value);
    this.valueToKey.set(value, key);
  }

  getByKey(key) {
    return this.keyToValue.get(key);
  }

  getByValue(value) {
    return this.valueToKey.get(value);
  }

  deleteByKey(key) {
    const value = this.keyToValue.get(key);
    this.keyToValue.delete(key);
    this.valueToKey.delete(value);
  }

  deleteByValue(value) {
    const key = this.valueToKey.get(value);
    this.valueToKey.delete(value);
    this.keyToValue.delete(key);
  }
}