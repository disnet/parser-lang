function mustImplement() { throw new Error('Must implement in base class'); }

class IndexedArray {
  constructor(array, index) {
    this.array = array;
    this.index = index;
  }
}

class Outcome {
  map(f) { mustImplement(); }
  forEach(f) { mustImplement(); }
  chain(f) { mustImplement(); }
}
class Success extends Outcome {

  constructor(value) {
    super();
    this.success = true;
    this.value = value;
  }

  // f: A => B
  // ret: Outcome<B>
  map(f) {
    return new Success(f(this.value));
  }

  // f: A => void
  // ret: Outcome<A>
  forEach(f) {
    f(this.value);
    return this;
  }

  // f: A => Outcome<B>
  // ret: Outcome<B>
  chain(f) {
    return f(this.value);
  }

}
class Failure extends Outcome {

  constructor(msg) {
    super();
    this.success = false;
    this.msg = msg;
  }

  // f: A => B
  // ret: Outcome<B>
  map(f) {
    return this;
  }
  
  // f: A => void
  // ret: Outcome<A>
  forEach(f) {
    return this;
  }

  // f: A => Outcome<B>
  // ret: Outcome<B>
  chain(f) {
    return this;
  }
}

export default class Parser {

  // action: Context => Outcome<A>
  constructor(action) {
    this.action = action;
  }

  // ctx: Context
  // ret: Outcome<A>
  parse(ctx) {
    return this.action(Context.from(ctx)); 
  }

  static makeSuccess(v, ctx) {
    return new Success({ value: v, ctx });
  }

  static makeFailure(msg) {
    return new Failure(msg);
  }

  static of(v) {
    return new Parser(ctx => Parser.makeSuccess(v, ctx));
  }

  static failure(msg) {
    return new Parser(_ => Parser.makeFailure(msg));
  }

  // ret: Parser<A, Context>
  static zero() {
    return Parser.failure('');
  }

  // f: A => B
  // ret: Parser<B, Context>
  map(f) {
    return new Parser(ctx => 
      this.parse(ctx)
          .map(({ value, ctx }) => Parser.makeSuccess(f(value), ctx))
    );
  }

  // f: A => Parser<B, Context>
  // ret: Parser<B, Context>
  chain(f) {
    return new Parser(ctx => 
      this.parse(ctx)
          .map(({ value, ctx }) => ({ value: f(value), ctx }))
          .chain(({ value, ctx }) => value.parse(ctx))
    );
  }
}


export class Context {
  constructor(array, index = 0) {
    this.array = array;
    this.index = index;
  }

  static of(...values) {
    return new Context(values);
  }

  static from(arrayLike) {
    if (typeof arrayLike[Context.iterator] === 'function') {
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

  [Symbol.iterator]() {
    return this;
  }
}
Context.iterator = Symbol('Context.iterator');
Context.prototype[Context.iterator] = function() {
  return new Context(this.array, this.index);
}

export function empty() {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.iterator]();
    let result = nextCtx.next();
    if (result.done) {
      return Parser.makeSuccess(void 0, nextCtx);
    }
    return Parser.makeFailure('list not empty');
  });
}

// ret: Parser<A, Context>
export function item() {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.iterator]();
    let result = nextCtx.next();
    if (result.done) {
      return Parser.makeFailure('list is empty');
    }
    return Parser.makeSuccess(result.value, nextCtx);
  });
}

// f: A => boolean
// ret: Parser<A, Context>
export function satisfy(f, failMsg = 'Did not satisfy predicate') {
  return item().chain(item => 
    f(item) ? Parser.of(item) : Parser.failure(failMsg)
  );
}