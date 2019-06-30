import { Outcome, Failure } from './outcome';
import Context from './context';

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

  tryParse(ctx) {
    let outcome = this.parse(ctx);
    if (!outcome.success) throw new Error(outcome);
    return outcome.result.value;
  }

  static of(value) {
    return new Parser(ctx =>
      Outcome.of({
        value,
        ctx,
      })
    );
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
      this.parse(ctx).chain(({ value, ctx }) =>
        Outcome.of({
          value: f(value),
          ctx,
        })
      )
    );
  }

  debug(f = console.log) {
    return new Parser(ctx =>
      this.parse(ctx).chain(({ value, ctx }) => {
        f(value);
        return Outcome.of({
          value,
          ctx,
        });
      })
    );
  }

  // parser: Parser<A => B, Context>
  // ret: Parser<B, Context>
  ap(parser) {
    return new Parser(ctx =>
      this.parse(ctx).chain(({ value: a, ctx }) =>
        parser.parse(ctx).chain(({ value: f, ctx }) =>
          Outcome.of({
            value: f(a),
            ctx,
          })
        )
      )
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

  skip(other) {
    return sequence(this, other).map(([fst, snd]) => fst);
  }

  // f: A => Parser<B, Context>
  // ret: Parser<B, Context>
  chain(f) {
    return new Parser(ctx =>
      this.parse(ctx).chain(({ value, ctx }) => f(value).parse(ctx))
    );
  }

  // ret: Parser<Array<A>, Context>
  many() {
    return this.between();
  }

  // n: number >= 0
  // max?: number >= 0
  // ret: Parser<Array<A>, Context>
  times(n, max = n) {
    return this.between(n, max);
  }

  // n: number >= 0
  // ret: Parser<Array<A>, Context>
  atMost(n) {
    return this.between(0, n);
  }

  // n: number >= 0
  // ret: Parser<Array<A>, Context>
  atLeast(n) {
    return this.between(n);
  }

  between(requiredLowerBound = 0, requiredUpperBound = Infinity) {
    return new Parser(ctx => {
      let matches = 0,
        values = [],
        nextCtx = ctx,
        lastCtx = ctx,
        value,
        success;
      do {
        ({
          success,
          result: { value, ctx: nextCtx },
        } = this.parse(nextCtx));
        if (success) {
          ++matches;
          values.push(value);
          lastCtx = nextCtx;
          if (matches > requiredUpperBound) {
            return new Failure(
              `Expected an upper bound of ${requiredUpperBound} but matched ${matches} times`
            );
          }
        }
      } while (success);
      if (matches >= requiredLowerBound) {
        return Outcome.of({
          value: values,
          ctx: lastCtx,
        });
      }
      return new Failure(
        `Expected a lower bound of ${requiredLowerBound} but matched ${matches} times`
      );
    });
  }

  // sep: Parser<B, Context>
  // ret: Parser<Array<A>, Context>
  sepBy1(sep) {
    return this.chain(x =>
      sep
        .chain(() => this.chain(y => Parser.of(y)))
        .atLeast(1)
        .chain(xs => Parser.of(xs.concat(x)))
    );
  }

  // sep: Parser<B, Context>
  // ret: Parser<Array<A>, Context>
  sepBy(sep) {
    return this.sepBy1(sep).alt(Parser.of([]));
  }

  result(value) {
    return this.map(() => value);
  }

  tie(sep = '') {
    return this.map(a => a.join(sep));
  }

  // ops: Array<{
  //   type: 'left' | 'right' | 'prefix'
  //   prec: number,
  //   action: A => B | (A, A) => B
  // }>
  // ret: Parser<B, Context>
  operators(ops) {
    let infixOps = alternatives(
      ...ops
        .filter(op => op.type === 'left' || op.type === 'right')
        .reduce(
          (acc, op) =>
            acc.concat(
              op.parser.result({
                assoc: op.type,
                prec: op.prec,
                action: op.action,
              })
            ),
          []
        )
    );
    let prefixOps = alternatives(
      ...ops
        .filter(op => op.type === 'prefix')
        .reduce(
          (acc, op) =>
            acc.concat(
              op.parser.result({
                assoc: op.type,
                prec: op.prec,
                action: op.action,
              })
            ),
          []
        )
    );

    return new Parser(ctx => {
      let stack = [];
      let prec = 0;
      let assoc = 'left';
      let action = x => x;
      let nextCtx = ctx;
      while (true) {
        let outcome = this.parse(nextCtx);
        if (!outcome.success) {
          if (prefixOps != null) {
            let opOutcome = prefixOps.parse(nextCtx);
            if (
              opOutcome.success &&
              opOutcome.result.value.assoc === 'prefix'
            ) {
              stack.push({
                prec,
                assoc,
                action,
              });
              assoc = opOutcome.result.value.assoc;
              prec = opOutcome.result.value.prec;
              action = opOutcome.result.value.action;
              nextCtx = opOutcome.result.ctx;
              continue;
            }
          }
          return new Failure('Did not match item in operator');
        } else {
          nextCtx = outcome.result.ctx;
        }

        let opOutcome = infixOps.parse(nextCtx);
        if (opOutcome.success) {
          if (ltAssoc(assoc, prec, opOutcome.result.value.prec)) {
            stack.push({
              prec,
              assoc,
              action,
            });
            prec = opOutcome.result.value.prec;
            assoc = opOutcome.result.value.assoc;
            action = opOutcome.result.value.action.bind(
              null,
              outcome.result.value
            );
          } else {
            let left = action(outcome.result.value);
            prec = opOutcome.result.value.prec;
            assoc = opOutcome.result.value.assoc;
            action = opOutcome.result.value.action.bind(null, left);
          }
          nextCtx = opOutcome.result.ctx;
        } else {
          let value = action(outcome.result.value);
          while (stack.length > 0) {
            ({ action } = stack.pop());
            value = action(value);
          }
          return Outcome.of({
            value,
            ctx: nextCtx,
          });
        }
      }
    });
  }
}

function ltAssoc(assoc, l, r) {
  switch (assoc) {
    case 'left':
      return l < r;
    case 'right':
      return r <= l;
    case 'prefix':
      return r <= l;
    default:
      throw new Error(`Unimplemented association ${assoc}`);
  }
}

export function lazy(f) {
  return succeed().chain(() => f());
}

export function succeed(value) {
  return new Parser(ctx => {
    return Outcome.of({ value, ctx });
  });
}

export function empty() {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.clone]()[Symbol.iterator]();
    let result = nextCtx.next();
    if (result.done) {
      return Outcome.of({
        value: void 0,
        ctx: nextCtx,
      });
    }
    return new Failure('list not empty');
  });
}

// ret: Parser<A, Context>
export function item() {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.clone]()[Symbol.iterator]();
    let result = nextCtx.next();
    if (result.done) {
      return new Failure('list is empty');
    }
    return Outcome.of({
      value: result.value,
      ctx: nextCtx,
    });
  });
}

export function string(s) {
  return new Parser(ctx => {
    let nextCtx = ctx[Context.clone]()[Symbol.iterator]();
    for (let toMatch of s) {
      let x = nextCtx.next();
      if (x.done || x.value !== toMatch)
        return new Failure(`The prefix ${s} did not match`);
    }
    return Outcome.of({
      value: s,
      ctx: nextCtx,
    });
  });
}

// f: A => boolean
// ret: Parser<A, Context>
export function satisfy(f, failMsg = c => `${c} did not satisfy predicate`) {
  return item().chain(item =>
    f(item) ? Parser.of(item) : Parser.failure(failMsg(item))
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
  return new Parser(ctx => {
    let result = [];
    let nextCtx = ctx;
    for (let p of parsers) {
      let outcome = p.parse(nextCtx);
      if (!outcome.success) {
        return new Failure(`Sequence failed`, outcome);
      }
      result.push(outcome.result.value);
      nextCtx = outcome.result.ctx;
    }
    return Outcome.of({
      value: result,
      ctx: nextCtx,
    });
  });
}

// ...parser: Parser<A, Context>
// ret: Parser<A, Context>
export function alternatives(...parser) {
  return new Parser(ctx => {
    let failures = [];
    for (let p of parser) {
      let outcome = p.parse(ctx);
      if (outcome.success) return outcome;
      failures.push(outcome);
    }
    return new Failure('No alternatives matched', failures);
  });
}

export function char(ch) {
  return satisfy(c => c === ch);
}

function anchorRegexAtStart(re) {
  return new RegExp(`^${re.source}`, re.flags);
}

export function regex(rawRegex) {
  let re = anchorRegexAtStart(rawRegex);
  return new Parser(ctx => {
    let nextCtx = ctx[Context.clone]();
    let result = nextCtx[Context.regex](re);
    if (result.done) return new Failure(`Did not match regex ${rawRegex}`);
    return Outcome.of({
      value: result.value,
      ctx: nextCtx,
    });
  });
}
