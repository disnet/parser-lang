import Context from './context';

const holeSymbol = Symbol('ContextWithHoles.hole');
export default class ContextWithHoles {
  constructor(parts, holes, index = 0, currentPart = 0, currentHole = 0) {
    this.parts = parts;
    this.holes = holes;
    this.index = index;
    this.currentPart = currentPart;
    this.currentHole = currentHole;
    if (this.holes.length !== this.parts.length - 1) {
      throw new Error(
        `The number of parts (${
          this.parts.length
        }) must be one more than the number of holes (${this.holes.length})`
      );
    }
  }

  [Context.regex](re) {
    let array = this.parts[this.currentPart];
    if (typeof array !== 'string') {
      throw new Error('Matching by regex only supported for string contexts');
    }
    if (array.length > 0 && this.index < array.length) {
      let match = re.exec(array.slice(this.index));
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

  [Context.next]() {
    if (this.currentPart < this.parts.length) {
      let array = this.parts[this.currentPart];
      if (this.index < array.length) {
        return {
          done: false,
          value: array[this.index++],
        };
      } else if (this.currentHole < this.holes.length) {
        this.currentPart++;
        let hole = this.holes[this.currentHole++];
        this.index = 0;
        return {
          done: false,
          value: {
            [holeSymbol]: hole,
          },
        };
      }
    }
    return {
      done: true,
    };
  }

  next() {
    return this[Context.next]();
  }

  [Context.clone]() {
    return new ContextWithHoles(
      this.parts,
      this.holes,
      this.index,
      this.currentPart,
      this.currentHole
    );
  }

  [Symbol.iterator]() {
    return this;
  }
}

ContextWithHoles.hole = holeSymbol;
