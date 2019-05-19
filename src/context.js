const cloneSymbol = Symbol('Context.clone');
const nextSymbol = Symbol('Context.next');
const regexSymbol = Symbol('Context.regex');

export default class Context {
  constructor(array, index = 0) {
    this.array = array;
    this.index = index;
  }

  static of(...values) {
    return new Context(values);
  }

  static from(arrayLike) {
    if (typeof arrayLike[Context.clone] === 'function') {
      return arrayLike;
    } else if (typeof arrayLike === 'string') {
      return new Context(arrayLike);
    }
    return new Context(Array.from(arrayLike));
  }

  static empty() {
    return new Context([]);
  }

  next() {
    return this[nextSymbol]();
  }

  [nextSymbol]() {
    if (this.array.length > 0 && this.index < this.array.length) {
      return {
        done: false,
        value: this.array[this.index++],
      };
    }
    return {
      done: true,
    };
  }

  [regexSymbol](re) {
    if (typeof this.array !== 'string') {
      throw new Error('Matching by regex only supported for string contexts');
    }
    if (this.array.length > 0 && this.index < this.array.length) {
      let match = re.exec(this.array.slice(this.index));
      if (match && match.index === 0) {
        let result = match[0];
        this.index += result.length;
        return {
          done: false,
          value: match[0],
        };
      }
    }
    return {
      done: true,
    };
  }

  // the point of Context.clone is to give immutable clones
  [cloneSymbol]() {
    return new Context(this.array, this.index);
  }

  [Symbol.iterator]() {
    return this;
  }
}

Context.clone = cloneSymbol;
Context.next = nextSymbol;
Context.regex = regexSymbol;
