[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v1.4%20adopted-ff69b4.svg)](code-of-conduct.md)

# ParserLang

ParserLang is parser combinator library. It lets you make parsers by combining other parsers.

Its primary superpower is the ability to define parsers declaratively with template literals:

```js
import { lang } from 'parser-lang';

let { calc } = lang`
  num = /[0-9]+/ > ${ch => parseInt(ch, 10)};

  addExpr = num '+' multExpr > ${([left, op, right]) => left + right}
          | num ;

  multExpr = addExpr '*' multExpr > ${([left, op, right]) => left * right}
           | addExpr ;
  
  calc = multExpr ;
`;

calc.tryParse('1+1*2');
// 3
```

It's monadic and stuff but don't get too hung up on that. It tries to be very friendly.

## Installing

```sh
npm install parser-lang
```

## Documentation

- [Tutorial](./docs/tutorial.md)
- [API Reference](./docs/api-reference.md)

## Related Projects/Papers

- [Parsimmon](https://github.com/jneen/parsimmon) - a JavaScript parser combinator library. ParserLang is heavily inspired by Parsimmon. Parsimmon is more coupled to parsing strings (ParserLang uses the [Context protocol](./docs/api-reference.md#context) to support a variety of input types) but also supports a wider variety of JavaScript runtimes.
- [Parsec](http://hackage.haskell.org/package/parsec) - a Haskell parser combinator library
- [Monadic Parser Combinators](http://www.cs.nott.ac.uk/~pszgmh/monparsing.pdf) - one of the seminal papers describing parser combinators
