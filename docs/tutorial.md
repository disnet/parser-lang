# Tutorial

## Getting Started

Install from npm:

```sh
npm install parser-lang
```

## Parsing

What even is a parser?

Some possible answers:

- the software component that analyzes source code
- the other frontend (ie, the frontend to the compiler, not UI development)
- the thing that makes abstract syntax trees

For our purposes a nice abstract definition is something like "a parser is a function from some input context to a result value paired with a potentially modified context (or a failure)".

More concretely, a `Parser` is the default export of ParserLang:

```js
import Parser from 'parser-lang';
```

A `Parser` is a class that you can construct:

```js
new Parser(ctx => {
  // ignore for now
});
```

Usually when working with ParserLang you combine already existing `Parser`s with other already existing `Parser`s (thus, parser combinator) so we can ignore the primitive constructor for now.

What you use most of the time are operators that return `Parser`s. For example, the `char` operator makes a parser that matches a single character:

```js
import { char } from 'parser-lang';

char('a').tryParse('ab');
// 'a'
```

The method `tryParse` is defined on `Parser` instances and takes an input context, the string `'ab'`, and returns the result of running the parser on the input. The `char('a')` parser consumes the input by a single character if consumed character equals `'a'`. If the character is not `'a'` the parser fails and `tryParse` throws an error:

```js
char('a').tryParse('ba');
// throw Error
```

If you want to create your own parser that consumes a single item if it matches some predicate you can use the `satisfy` function:

```js
import { satisfy } from 'parser-lang';

let digit = satisfy(ch => ch >= '0' && ch <= '9');
digit().tryParse('5');
// '5'
```

The `Parser` class defines a bunch of methods that let you combine parsers together. For example, if you want to match either one parser or another, use the `or` method:

```js
let aOrB = char('a').or(char('b'));

aOrB.tryParse('ba');
// 'b'
aOrB.tryParse('ab');
// 'a'
```

Matching one parser after another can be done with the `sequence` combinator:

```js
import { sequence } from 'parser-lang';

sequence(char('a'), char('b')).tryParse('ab');
// ['a', 'b']
```

Note that the result in the parser returned from `sequence` is an array of the results of its sub-parsers. This might not be the type that we want but it is easy to transform the result by using the `map` method:

```js
sequence(char('a'), char('b'))
  .map(([aResult, bResult]) => aResult + bResult)
  .tryParse('ab');
// 'ab'
```

Since joining arrays of strings is such a common operation, ParserLang defines the `tie` method:

```js
sequence(char('a'), char('b'))
  .tie()
  .tryParse('ab');
// 'ab'
```

## lang

One downside of defining parser combinators using JavaScript functions and methods is that it can become difficult to read as the parsers grow in complexity. The way ParserLang approaches handling this problem is by allowing you to define your parsers using a declarative language in template literals:

```js
import lang from 'parser-lang/lang';

let { a } = lang`
  a = 'a';
`;
a.tryParse('a');
// 'a'
```

The above is equivalent to `let a = char('a')` in JavaScript.

The `lang` template literal tag parses the template literal for a sequence of rules where the syntax for each rule is `[name] = [parser] ;`. Each rule `[parser]` is converted to a `Parser` and bound to the property `[name]` in the return object (e.g. the `a` parser is bound to the `a` property in the above example).

The possible syntax for `[parser]` are:

(Note that square brackets and `...` are meta-syntax)

- `'string'` a parser that matches the string `'string'`
- `/re/` a parser that matches the regular expression `re`
- `[name]` a parser defined in `[name]` rule
- `([parser])` group parser (to handle precedence)
- `!${pred}` a parser that satisfies the predicate `pred`
- `[parser_1] | ... | [parser_n]` a parser that tries each `[parser_i]` and matches the first one that succeeds
- `[parser_1] [parser_2] ...` a parser that matches each `[parser_i]` in sequence
- `[parser]*` a parser that matches `[parser]` zero or more times
- `[parser]+` a parser that matches `[parser]` one or more times
- `[parser] > ${f}` a parser that matches `[parser]` and then `map`s the result with `f`

For example,

```js
let { aOrB } = lang`
  a = 'a' > ${ch => ch.toUpperCase()};
  b = 'b' > ${ch => ch.toUpperCase()};

  aOrB = (a | b)* > ${resultArray => resultArray.join('')};
`;
aOrB.tryParse('aaabbb');
// 'AAABBB'
```
