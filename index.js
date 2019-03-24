function mustImplement() { throw new Error('Must implement in base class'); }

class IndexedArray {
  constructor(array, index) {
    this.array = array;
    this.index = index;
  }
}

class Outcome {
  static of(result) {
    return new Success(result);
  }
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

  static of(value) {
    return new Parser(ctx => Outcome.of({ value, ctx }));
  }

  static failure(msg) {
    return new Parser(_ => new Failure(msg));
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
          .chain(({ value, ctx }) => Outcome.of({ value: f(value), ctx }))
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
                    Outcome.of({ value: f(a), ctx })))
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

  // other: Parser<A, Context>
  // ret: Parser<A, Context>
  or(other) {
    return this.alt(other);
  }

  then(other) {
    return sequence(this, other).map(([fst, snd]) => snd);
  }

  // f: A => Parser<B, Context>
  // ret: Parser<B, Context>
  chain(f) {
    return new Parser(ctx => 
      this.parse(ctx)
          .chain(({ value, ctx }) => f(value).parse(ctx))
    );
  }


  // ret: Parser<Array<A>, Context>
  many() {
    return between(this);
  }

  // n: number >= 0
  // max?: number >= 0
  // ret: Parser<Array<A>, Context>
  times(n, max = n) {
    return between(this, n, max);
  }

  // n: number >= 0
  // ret: Parser<Array<A>, Context>
  atMost(n) {
    return between(this, 0, n);
  }

  // n: number >= 0
  // ret: Parser<Array<A>, Context>
  atLeast(n) {
    return between(this, n);
  }

  // sep: Parser<B, Context>
  // ret: Parser<Array<A>, Context>
  sepBy1(sep) {
    return this.chain(x => 
      sep.chain(() => this.chain(y => Parser.of(y)))
        .atLeast(1)
        .chain(xs => Parser.of(xs.concat(x)))
    );
  }

  // sep: Parser<B, Context>
  // ret: Parser<Array<A>, Context>
  sepBy(sep) {
    return this.sepBy1(sep).alt(Parser.of([]));
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
      return Outcome.of({ value: void 0, ctx: nextCtx });
    }
    return new Failure('list not empty');
  });
}

// ret: Parser<A, Context>
export function item() {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.iterator]();
    let result = nextCtx.next();
    if (result.done) {
      return new Failure('list is empty');
    }
    return Outcome.of({ value: result.value, ctx: nextCtx });
  });
}

// f: A => boolean
// ret: Parser<A, Context>
export function satisfy(f, failMsg = 'Did not satisfy predicate') {
  return item().chain(item => 
    f(item) ? Parser.of(item) : Parser.failure(failMsg)
  );
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

export function token(ch) {
  return satisfy(c => c === ch);
}
export function regex(re) {
  return satisfy(c => re.test(c));
}

function between(parser, requiredLowerBound = 0, requiredUpperBound = Infinity) {
  return new Parser(ctx => {
    let matches = 0, values = [], nextCtx = ctx, lastCtx = ctx, value, success;
    do {
      ({ success, result: { value, ctx: nextCtx }} = parser.parse(nextCtx));
      if (success) {
        ++matches;
        values.push(value);
        lastCtx = nextCtx;
        if (matches > requiredUpperBound) {
          return new Failure(`Expected an upper bound of ${requiredUpperBound} but matched ${matches} times`);
        }
      } 
    } while (success);
    if (matches >= requiredLowerBound) {
      return Outcome.of({ value: values, ctx: lastCtx });
    }
    return new Failure(`Expected a lower bound of ${requiredLowerBound} but matched ${matches} times`);
  });
}