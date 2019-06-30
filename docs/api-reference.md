# API Reference

- [Parser](#Parser)
  - [new Parser()](#constructor)
  - [Parser#parse](#parse)
  - [Parser#tryParse](#tryParse)
  - [Parser.of](#par-of)
  - [Parser.zero](#zero)
  - [Parser.failure](#failure)
  - [Parser#map](#map)
  - [Parser#ap](#ap)
  - [Parser#chain](#chain)
  - [Parser#or](#or)
  - [Parser#alt](#alt)
  - [Parser#then](#then)
  - [Parser#skip](#skip)
  - [Parser#result](#result)
  - [Parser#many](#many)
  - [Parser#atLeast](#atLeast)
  - [Parser#atMost](#atMost)
  - [Parser#times](#times)
  - [Parser#tie](#tie)
- [Operators](#Operators)
  - [succeed](#succeed)
  - [empty](#empty)
  - [item](#item)
  - [satisfy](#satisfy)
  - [char](#char)
  - [string](#string)
  - [regex](#regex)
  - [sequence](#sequence)
  - [alternatives](#alternatives)
- [Types](#Types)
  - [Outcome](#Outcome)
    - [Outcome.of](#outcome-of)
    - [Outcome#map](#outcome-map)
    - [Outcome#chain](#outcome-chain)
    - [Outcome#forEach](#forEach)
  - [Context](#context)
  - [ParseResult](#ParseResult)

## Parser

```js
import Parser from 'parser-lang';
```

The `Parser` is the primary class in ParserLang. A `Parser` is a wrapper around a function that does the parsing along with a variety of methods for combining the `Parser` instance with other `Parser`s.

### `constructor`

```
Parser<A>(action: Context => Outcome<ParserResult<A>>)
```

A `Parser` is constructed by giving it a function that takes a `Context` to consume and returns an `Outcome` of a `ParseResult`.

An `Outcome` represents a `Success` or a `Failure` (for those coming from a functional background this is the `Either` type just with more clear names).

A `ParseResult` is an object of shape `{ value, ctx }` that holds the resulting value along with the new `Context`.

```js
import { Outcome } from 'parser-lang/outcome';

let p = new Parser(ctx => {
  return Outcome.of({
    value: true,
    ctx,
  });
});
```

### `parse`

```
Parser<A>#parse(
  ctx: string | Array | Iterable | Context
): Outcome<ParseResult<A>>
```

Runs the wrapped `action` by first converting `ctx` to a `Context`.

### `tryParse`

```
Parser<A>#tryParse(
  ctx: string | Array | Iterable | Context
): A
```

Runs the wrapped `action` by first converting `ctx` to a `Context` and then return its value (unwrapping the value from the `Outcome` and `ParseResult`). If the `action` returns a `Failure` outcome throws an `Error`.

```js
Parser.failure('fail').tryParse('');
// throws Error('fail')
```

### <a name="par-of"></a> `of`

```
Parser.of(value: A): Parser<A>
```

Returns a parser that consumes nothing from the context and succeeds with `value`.

```js
Parser.of(42).tryParse('123');
// 42
```

### `zero`

```
Parser.zero(): Parser<>
```

Returns a parser that always results in a `Failure` outcome.

```js
Parser.zero().tryParse('');
// throws Error
```

### `failure`

```
Parser.failure(msg: string): Parser<>
```

Returns a parser that always results in a `Failure` outcome with `msg` as the failure message.

```js
Parser.failure('a message').tryParse('');
// throws Error('a message')
```

### `map`

```
Parser<A>#map(f: A => B): Parser<B>
```

Returns a parser that runs the first parser and then applies `f` to the resulting value.

```js
Parser.of(2)
  .map(n => n * 10)
  .tryParse('');
// 20
```

### `ap`

```
Parser<A>#ap(
  parser: Parser<A => B>
): Parser<B>
```

Returns a parser that runs the first parser and then runs `parser` to get the function `A => B` to apply to the result of the first parser.

### `chain`

```
Parser<A>#chain(
  f: A => Parser<B>
): Parser<B>
```

Returns a parser that runs the first parser and then applies the value to `f` and returns the resulting parser.

### `or`

```
Parser<A>#or(
  other: Parser<B>
): Parser<A | B>
```

Returns a parser that runs the first parser and if it results in a failure runs `other`.

```js
Parser.zero()
  .or(Parser.of(1))
  .tryParse('');
// 1
```

### `alt`

Alias for `or`.

### `then`

```
Parser<A>#then(
  other: Parser<B>
): Parser<B>
```

Returns a parser that runs the first parser and then the second parser and returns the result of the second parser.

```js
Parser.of(1)
  .then(Parser.of(2))
  .tryParse('');
// 2
```

### `skip`

```
Parser<A>#skip(
  other: Parser<B>
): Parser<A>
```

Returns a parser that runs the first parser and then the second parser and returns the result of the first parser.

```js
Parser.of(1)
  .skip(Parser.of(2))
  .tryParse('');
// 1
```

### `result`

```
Parser<A>#result(
  value: B
): Parser<B>
```

Returns a parser that runs the first parser and then uses `value` as the result.

```js
Parser.of(1)
  .result('a')
  .tryParse('');
// 'a'
```

### `many`

```
Parser<A>#many(): Parser<A[]>
```

Returns a parser that matches this parser zero or more times and records the matched values in an array.

```js
import { char } from 'parser-lang';

char('a')
  .many()
  .tryParse('aaa');
// ['a', 'a', 'a' ]
char('a')
  .many()
  .tryParse('bbb');
// []
```

### `atLeast`

```
Parser<A>#atLeast(n: number): Parser<A[]>
```

Returns a parser that matches this parser at least `n` times and records the matched values in an array.

```js
import { char } from 'parser-lang';

char('a')
  .atLeast(1)
  .tryParse('aaa');
// ['a', 'a', 'a' ]
char('a')
  .atLeast(1)
  .tryParse('bbb');
// throw Error
```

### `atMost`

```
Parser<A>#atMost(n: number): Parser<A[]>
```

Returns a parser that matches this parser at most `n` times and records the matched values in an array.

```js
import { char } from 'parser-lang';

char('a')
  .atMost(5)
  .tryParse('aaa');
// ['a', 'a', 'a' ]
char('a')
  .atMost(1)
  .tryParse('bbb');
// []
char('a')
  .atMost(1)
  .tryParse('aaa');
// throw Error
```

### `times`

```
Parser<A>#times(n: number, max: number = n): Parser<A[]>
```

Returns a parser that matches this parser at least `n` but no more than `max` times and records the matched values in an array.

```js
import { char } from 'parser-lang';

char('a')
  .times(3)
  .tryParse('aaa');
// ['a', 'a', 'a' ]
char('a')
  .times(1, 3)
  .tryParse('aa');
// ['a', 'a']
char('a')
  .times(1)
  .tryParse('bbb');
// throw Error
```

### `tie`

```
Parser<A[]>#tie(
  sep: string = ''
): Parser<string>
```

Returns a parser that runs the first parser and then joins the resulting array by `sep`.

```js
Parser.of(['a', 'b', 'c'])
  .tie()
  .tryParse('');
// 'abc'
```

## Operators

### `succeed`

```
succeed(value: A): Parser<A>
```

Returns a parser that always succeeds with `value`.

```js
import { succeed } from 'parser-lang';

succeed('a').tryParse('');
// 'a'
```

### `empty`

```
empty(): Parser<void>
```

Returns a parser that succeeds when the context is empty.

```js
import { empty } from 'parser-lang';

empty().tryParse([]);
// undefined
empty().tryParse(['a']);
// throw Error
```

### `item`

```
item(): Parser<A>
```

Returns a parser that consumes the next item in the context.

```js
import { item } from 'parser-lang';

item().tryParse('abc');
// 'a'
item().tryParse('');
// throw Error
```

### `satisfy`

```
satisfy(
  f: A => boolean,
  msg?: A => string
): Parser<A>
```

Returns a parser that consumes the next item from the context and applies the predicate `f` on the result. The parser fails if the predicate fails and invokes `msg` with the item result to get the failure message.

```js
import { satisfy } from 'parser-lang';

satisfy(n => n > 2).tryParse([10]);
// 10
satisfy(n => n > 2).tryParse([1, 10]);
// throw Error
satisfy(n => n > 2, n => `${n} is not big enough`).tryParse([1, 10]);
// throw Error('1 is not big enough')
```

### `char`

```
char(ch: string): Parser<string>
```

Returns a parser that matches the character `ch`.

```js
import { char } from 'parser-lang';

char('a').tryParse('abc');
// 'a'
char('b').tryParse('abc');
// throw Error
```

### `string`

```
string(s: string | Iterable): Parser<string>
```

Returns a parser that matches the string or iterable `s`.

```js
import { string } from 'parser-lang';

string('foo').tryParse('foobar');
// 'foo'
string('foo').tryParse(['f', 'o', 'o', 'b', 'a', 'r']);
// 'foo'
string('foo').tryParse('bar');
// throw Error
```

### `regex`

```
regex(re: RegExp): Parser<string>
```

Returns a parser that matches the regular expression `re`.

```js
import { regex } from 'parser-lang';

regex(/foo/).tryParse('foobar');
// 'foo'
regex(/foo/).tryParse('barfoo');
// throw Error
```

### `sequence`

```
sequence(
  ...parsers: Parser<A>
): Parser<A[]>
```

Returns a parser that matches a sequence of `parsers` and collects their results in an array.

```js
import { sequence } from 'parser-lang';

sequence(char('a'), char('b')).tryParse('abcd');
// ['a', 'b']
sequence(char('a'), char('b')).tryParse('afg');
// throw Error
```

### `alternatives`

```
alternatives(
  ...parsers: Parser<A>
): Parser<A>
```

Returns a parser that tries each parser from `parsers` and returns the first one that succeeds.

```js
import { alternatives } from 'parser-lang';

alternatives(char('a'), char('b')).tryParse('a');
// 'a'
alternatives(char('a'), char('b')).tryParse('b');
// 'b'
alternatives(char('a'), char('b')).tryParse('c');
// throw Error
```

## Types

### `Outcome`

An `Outcome` is an abstract class with two implementations, a `Success` or a `Failure`. An `Outcome` is the same as the `Either` type from haskell and similar languages.

#### `of` <a id="outcome-of"></a>

```
Outcome.of(value: A): Outcome<A>
```

Returns a `Success` of `value`.

#### <label id="outcome-map"></a> `map`

```
Outcome<A>#map(f: A => B): Outcome<B>
```

Return a new outcome with the result of applying `f` to the value in this outcome.

```js
Outcome.of(1).map(x => x + 1);
// Success { value: 2 }
```

#### <label id="outcome-chain"></a> `chain`

```
Outcome<A>#chain(
  f: A => Outcome<B>
): Outcome<B>
```

Return the result of applying `f` to the value in this outcome.

#### `forEach`

```
Outcome<A>#forEach(
  f: A => void
): Outcome<A>
```

Return the original outcome after applying `f` to the value for its effects.

### Context

```js
import Context from 'parser-lang/context`;
```

The **context** protocol defines a standard way for mutable iterable objects to be used in an "immutable" way by allowing consumers to make clones before performing mutations.

An object is a context object when:

- it follows the [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#The_iterator_protocol) protocol
- it has a method accessible on the symbol property `[Context.clone]` with behavior described below
- it optionally has a method accessible on the symbol property `[Context.regex]` with behavior described below

The `[Context.clone]` method is a zero argument function that must return a fresh clone of the context object. Any subsequent mutations on the original object (e.g. calls to `next`) must not effect the clone.

The optional `[Context.regex]` method is a function that takes a single regular expression argument and returns an object with the following properties:

- `done` - a `boolean` indicating if the regular expression matched. The match must start from the current location in the iterator
- `value` - the string matched by the regular expression. Only present if `done` is `true`

Note the similarities to the `next` method of an iterator.

### `ParseResult`

```js
type ParseResult<A> = {
  value: A,
  ctx: Context,
};
```

`ParseResult` is the type returned from a parse. It represents the `value` that was parsed along with a new `Context` the resulted in consuming the previous `Context`.
