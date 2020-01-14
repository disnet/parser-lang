import Parser, {
  sequence,
  alternatives,
  char,
  satisfy,
  regex,
  empty,
  lazy,
  succeed,
  string,
  item,
} from './parser';
import StateContext from './state-context';
import ContextWithHoles from './context-with-holes';
import { Outcome, Failure } from './outcome';

const snd = ([, x]) => x;

class Token {
  constructor(type, value) {
    this.type = type;
    this.value = value;
  }
  toString() {
    return `Token { type = ${this.type}, value = ${this.value} }`;
  }
}
const emptySigal = {};
function isToken(type, value = emptySigal) {
  return satisfy(
    x => {
      if (x != null && x.type === type) {
        return value === emptySigal || value === x.value;
      }
      return false;
    },
    c =>
      `${c} is not a token with type ${type}${
        value === empty ? '' : ` or value ${value}`
      }`
  );
}
class Rule {
  constructor(name, definition) {
    this.name = name;
    this.definition = definition;
  }
}

const hole = satisfy(o => {
  return o != null && typeof o === 'object' && ContextWithHoles.hole in o;
});

const whitespace = regex(/[ \t\n]+/);
const optWhitespace = whitespace.or(succeed(''));

const identStart = regex(/[a-zA-Z]/);
const identRest = regex(/[a-zA-Z0-9]*/).or(succeed(''));
const ident = sequence(identStart, identRest).tie();

const isLineTerminator = ch =>
  ch === 0x0a || ch === 0x0d || ch === 0x2028 || ch === 0x2029;

const nonEscapedStringCharacter = satisfy(
  ch => ch !== "'" && ch !== '\\' && ch !== '\n'
);

const hexDigit = alternatives(
  satisfy(ch => ch >= '0' && ch <= '9').map(ch => ch.charCodeAt(0) - 48),
  satisfy(ch => ch >= 'a' && ch <= 'f').map(ch => ch.charCodeAt(0) - 87),
  satisfy(ch => ch >= 'A' && ch <= 'F').map(ch => ch.charCodeAt(0) - 55)
);
const hexDigits = hexDigit
  .atLeast(1)
  .map(hexCodes => hexCodes.reduce((acc, hex) => (acc << 4) | hex, 0))
  .map(unescaped => String.fromCodePoint(unescaped));

const escapedStringCharacter = char('\\').then(
  alternatives(
    char('n').result('\n'),
    char('r').result('\r'),
    char('t').result('\t'),
    char('b').result('\b'),
    char('f').result('\f'),
    char('v').result('\v'),
    char('u').then(
      alternatives(sequence(char('{'), hexDigits, char('}')).map(snd))
    ),
    item()
  )
);

const stringLiteral = sequence(
  char("'"),
  alternatives(nonEscapedStringCharacter, escapedStringCharacter)
    .many()
    .tie(),
  char("'")
).map(snd);

const slash = char('/');
const reFlags = regex(/[gimuy]+/).or(succeed(''));
const looseRegexPattern = alternatives(
  sequence(regex(/\\\\/).map(s => '\\'), char('/')).tie(),
  regex(/[^\n\/]+/)
)
  .many()
  .tie();

const punctuator = alternatives(
  char('='),
  char('|'),
  char('('),
  char(')'),
  char('*'),
  char('+'),
  char(';'),
  char('!'),
  string('>>'),
  char('>'),
  char('@')
);

export const lex = sequence(
  optWhitespace,
  alternatives(
    sequence(slash, looseRegexPattern, slash, reFlags, optWhitespace).map(
      ([, body, , flags]) => new Token('regex', { body, flags })
    ),
    sequence(ident, optWhitespace).map(([value]) => new Token('ident', value)),
    sequence(hole, optWhitespace).map(
      ([value]) => new Token('hole', value[ContextWithHoles.hole])
    ),
    sequence(stringLiteral, optWhitespace).map(
      ([value]) => new Token('string', value)
    ),
    sequence(punctuator, optWhitespace).map(
      ([value]) => new Token('punctuator', value)
    )
  ).many()
).map(snd);

const isPunctuatorToken = value => isToken('punctuator', value);

const identToken = isToken('ident');
const stringToken = isToken('string');
const holeToken = isToken('hole');
const regexToken = isToken('regex');

const eqToken = isPunctuatorToken('=');
const pipeToken = isPunctuatorToken('|');
const starToken = isPunctuatorToken('*');
const plusToken = isPunctuatorToken('+');
const openParenToken = isPunctuatorToken('(');
const closeParenToken = isPunctuatorToken(')');
const semicolonToken = isPunctuatorToken(';');
const bangToken = isPunctuatorToken('!');
const rarrowToken = isPunctuatorToken('>');
const chainToken = isPunctuatorToken('>>');
const atToken = isPunctuatorToken('@');

function getState(f) {
  return new Parser(ctx => {
    if (typeof ctx[StateContext.state] !== 'function') {
      return new Failure('State does not exist on the context');
    }
    let state = ctx[StateContext.state]();

    return Outcome.of({
      value: succeed().chain(() => {
        return f(state);
      }),
      ctx,
    });
  });
}

const identDefinition = identToken.chain(({ value: name }) =>
  getState(state => state[name])
);

const stringLiteralDefinition = stringToken.map(({ value }) => string(value));

const satisfiesDefinition = bangToken
  .then(holeToken)
  .map(({ value: satFunc }) => satisfy(satFunc));

const parserHoleDefinition = atToken
  .then(holeToken)
  .map(({ value: parser }) => parser);

const regexDefinition = regexToken.map(({ value: { body, flags } }) =>
  regex(new RegExp(body, flags))
);

const primDefinition = lazy(() =>
  alternatives(
    stringLiteralDefinition,
    identDefinition,
    regexDefinition,
    satisfiesDefinition,
    parserHoleDefinition,
    sequence(openParenToken, definition, closeParenToken).map(snd)
  )
);

const baseDefinition = alternatives(
  sequence(primDefinition, starToken).map(([p]) => p.many()),
  sequence(primDefinition, plusToken).map(([p]) => p.atLeast(1)),
  primDefinition
);

const isMapToken = t => t != null && t.type === 'punctuator' && t.value === '>';

const mapDefinition = sequence(
  alternatives(
    baseDefinition.atLeast(2).map(defs => sequence(...defs)),
    baseDefinition
  ),
  sequence(alternatives(rarrowToken, chainToken), holeToken).many()
).map(([base, maps]) => maps.reduce((acc, [t, { value: f }]) => isMapToken(t) ? acc.map(f) : acc.chain(f), base));

const sequenceDefinition = mapDefinition
  .many()
  .map(rest => (rest.length === 1 ? rest[0] : sequence(...rest)));

const alternativeDefinition = sequence(
  sequenceDefinition,
  sequence(pipeToken, sequenceDefinition).many()
).map(([first, rest]) =>
  alternatives(...[first].concat(rest.map(([, p]) => p)))
);

const definition = alternativeDefinition;

const rule = sequence(identToken, eqToken, definition, semicolonToken).map(
  ([name, , definition]) => new Rule(name.value, definition)
);

const rules = rule.many();

export default function lang({ raw: strings }, ...args) {
  let lexemes = lex.tryParse(new ContextWithHoles(strings, args));
  let state = {};
  let parseValue = rules.tryParse(StateContext.from(lexemes, state));

  parseValue.forEach(({ name, definition }) => {
    state[name] = definition;
  });
  return state;
}
