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

  constructor(result) {
    super();
    this.success = true;
    this.result = result;
  }

  // f: A => B
  // ret: Outcome<B>
  map(f) {
    return new Success(f(this.result));
  }

  // f: A => void
  // ret: Outcome<A>
  forEach(f) {
    f(this.result);
    return this;
  }

  // f: A => Outcome<B>
  // ret: Outcome<B>
  chain(f) {
    return f(this.result);
  }

}
class Failure extends Outcome {

  constructor(result) {
    super();
    this.success = false;
    this.result = result;
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
          .chain(({ value, ctx }) => Parser.makeSuccess(f(value), ctx))
    );
  }

  // parser: Parser<A => B, Context>
  // ret: Parser<B, Context>
  ap(parser) {
    return new Parser(ctx =>
      this.parse(ctx)
          .chain(({ value: a, ctx }) => 
            parser.parse(ctx)
                  .chain(({ value: f, ctx }) => 
                    Parser.makeSuccess(f(a), ctx)))
    );
  }

  // other: Parser<A, Context>
  // ret: Parser<A, Context>
  alt(other) {
    return new Parser(ctx => {
      let outcome = this.parse(ctx);
      if (!outcome.success) {
        return other.parse(ctx);
      }
      return outcome;
    });
  }

  // f: A => Parser<B, Context>
  // ret: Parser<B, Context>
  chain(f) {
    return new Parser(ctx => 
      this.parse(ctx)
          .chain(({ value, ctx }) => f(value).parse(ctx))
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

// parser: Parser<A, Context>
// ret: Parser<Array<A>, Context>
export function many(parser) {
  return parser.chain(x => 
    many(parser).chain(xs => Parser.of(xs.concat(x)))
  ).alt(Parser.of([]));
}

// parser: Parser<A, Context>
// ret: Parser<Array<A>, Context>
export function many1(parser) {
  return parser.chain(x => 
    many(parser).chain(xs => Parser.of(xs.concat(x)))
  );
}

// parser: Parser<A, Context>
// sep: Parser<B, Context>
// ret: Parser<Array<A>, Context>
export function sepBy1(parser, sep) {
  return parser.chain(x => 
    many1(sep.chain(() => parser.chain(y => Parser.of(y))))
      .chain(xs => Parser.of(xs.concat(x)))
  );
}

// parser: Parser<A, Context>
// sep: Parser<B, Context>
// ret: Parser<Array<A>, Context>
export function sepBy(parser, sep) {
  return sepBy1(parser, sep).alt(Parser.of([]));
}

// f: (A, B) => C
// ret: (Parser<A, Context>, Parser<B, Context>) => Parser<C, Context>
export function lift2(f) {
  return (a, b) => a.chain(va => b.chain(vb => Parser.of(f(va, vb))));
}

// ...parser: Parser<A, Context>
// ret: Parser<Array<A>, Context>
export function sequence(...parsers) {
  return parsers.reduce(
    lift2((a, b) => a.concat(b)), 
    Parser.of([])
  );
}

// ...parser: Parser<A, Context>
// ret: Parser<A, Context>
export function disj(...parser) {
  return parser.reduce((acc, p) => acc.alt(p));
}

// parser: Parser<A, Context>
// op: Parser<(A, A) => A, Context>
// ret: Parser<A, Context>
export function infixl(parser, op) {
  function rest(x) {
    return op.chain(f => parser.chain(y => rest(f(x, y)))).alt(Parser.of(x));
  }
  return parser.chain(rest);
}

// parser: Parser<A, Context>
// op: Parser<(A, A) => A, Context>
// ret: Parser<A, Context>
export function infixr(parser, op) {
  return parser.chain(x => op.chain(f => infixr(parser, op).chain(y => Parser.of(f(x, y)))).alt(Parser.of(x)));
}