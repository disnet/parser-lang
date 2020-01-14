import test from 'ava';
import lang from '../src/lang';
import { empty, succeed } from '../src/parser';

test('lang with a single token literal rule', t => {
  let { a } = lang`
  a = 'a';
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.throws(() => a.tryParse('b'));
  t.throws(() => a.tryParse(''));
});

test('lang with a multi char single token literal rule', t => {
  let { a } = lang`
  a = 'foo';
  `;

  t.deepEqual(a.tryParse('foo'), 'foo');
  t.throws(() => a.tryParse('f'));
  t.throws(() => a.tryParse(''));
});

test('lang with a string with escape sequences', t => {
  let { a, b, c, d, e } = lang`
  a = '\n';
  b = '\t';
  c = '\u{ffff}';
  d = '\\';
  e = '\z';
  `;

  t.deepEqual(a.tryParse('\n'), '\n');
  t.deepEqual(b.tryParse('\t'), '\t');
  t.deepEqual(c.tryParse('\u{ffff}'), '\u{ffff}');
  t.deepEqual(d.tryParse('\\'), '\\');
  t.deepEqual(e.tryParse('z'), 'z');
  t.throws(() => a.tryParse('f'));
  t.throws(() => a.tryParse(''));
});

test('lang with regex rule', t => {
  let { a } = lang`
  a = /foo/i;
  `;

  t.deepEqual(a.tryParse('Foo'), 'Foo');
  t.deepEqual(a.tryParse('foo'), 'foo');
  t.throws(() => a.tryParse('f'));
  t.throws(() => a.tryParse(''));
});

test('lang with regex rule with escaped slash', t => {
  let { a } = lang`
  a = /\\//i;
  `;

  t.deepEqual(a.tryParse('/'), '/');
  t.throws(() => a.tryParse('f'));
  t.throws(() => a.tryParse(''));
});

test('lang with regex rule with escaped paren', t => {
  let { a } = lang`
  a = /\(/i;
  `;

  t.deepEqual(a.tryParse('('), '(');
  t.throws(() => a.tryParse('f'));
  t.throws(() => a.tryParse(''));
});

test('lang with a single token literal rule with star', t => {
  let { a } = lang`
  a = 'a'*;
  `;

  t.deepEqual(a.tryParse(''), []);
  t.deepEqual(a.tryParse('a'), ['a']);
  t.deepEqual(a.tryParse('aaa'), ['a', 'a', 'a']);
});

test('lang with a single token literal rule with plus', t => {
  let { a } = lang`
  a = 'a'+;
  `;

  t.throws(() => a.tryParse(''));
  t.deepEqual(a.tryParse('a'), ['a']);
  t.deepEqual(a.tryParse('aaa'), ['a', 'a', 'a']);
});

test('lang with a sequence of token literals', t => {
  let { a } = lang`
  a = 'a' 'b';
  `;

  t.deepEqual(a.tryParse('ab'), ['a', 'b']);
  t.throws(() => a.tryParse(''));
  t.throws(() => a.tryParse('a'));
  t.throws(() => a.tryParse('ba'));
});

test('lang with alternation of token literals', t => {
  let { a } = lang`
  a = 'a' | 'b';
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.deepEqual(a.tryParse('b'), 'b');
  t.deepEqual(a.tryParse('bc'), 'b');
  t.deepEqual(a.tryParse('ba'), 'b');
  t.deepEqual(a.tryParse('bb'), 'b');
  t.throws(() => a.tryParse(''));
  t.throws(() => a.tryParse('c'));
});

test('lang with sequence of an alternative', t => {
  let { a } = lang`
  a = 'a' | 'b' 'c';
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.deepEqual(a.tryParse('abc'), 'a');
  t.deepEqual(a.tryParse('bc'), ['b', 'c']);
  t.throws(() => a.tryParse(''));
  t.throws(() => a.tryParse('b'));
  t.throws(() => a.tryParse('c'));
});

test('lang with either "a" or many "b"', t => {
  let { a } = lang`
  a = 'a' | 'b'*;
  `;

  t.deepEqual(a.tryParse(''), []);
  t.deepEqual(a.tryParse('a'), 'a');
  t.deepEqual(a.tryParse('b'), ['b']);
  t.deepEqual(a.tryParse('bb'), ['b', 'b']);
});

test('lang with sequence of either "a" or "b"', t => {
  let { a } = lang`
  a = ('a' | 'b')*;
  `;

  t.deepEqual(a.tryParse(''), []);
  t.deepEqual(a.tryParse('a'), ['a']);
  t.deepEqual(a.tryParse('b'), ['b']);
  t.deepEqual(a.tryParse('abba'), ['a', 'b', 'b', 'a']);
});

test('lang with two rules', t => {
  let { a, b } = lang`
  a = 'a';
  b = 'b';
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.throws(() => a.tryParse('b'));
  t.deepEqual(b.tryParse('b'), 'b');
  t.throws(() => b.tryParse('a'));
});

test('lang with two rules where b depends on a', t => {
  let { a, b } = lang`
  a = 'a';
  b = a;
  `;

  t.throws(() => a.tryParse(''));
  t.throws(() => a.tryParse('b'));
  t.deepEqual(a.tryParse('a'), 'a');

  t.throws(() => b.tryParse(''));
  t.throws(() => b.tryParse('b'));
  t.deepEqual(b.tryParse('a'), 'a');
});

test('lang with a sequence with two rules', t => {
  let { c } = lang`
  a = 'a';
  b = 'b';
  c = a b;
  `;
  t.throws(() => c.tryParse(''));
  t.throws(() => c.tryParse('a'));
  t.throws(() => c.tryParse('b'));
  t.deepEqual(c.tryParse('ab'), ['a', 'b']);
});

test('lang with a satisfies hole', t => {
  let { a } = lang`
    a = !${ch => ch === 'a'};
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.throws(() => a.tryParse('b'));
  t.throws(() => a.tryParse(''));
});

test('lang with a parser hole', t => {
  let { a } = lang`
    a = @${empty()};
  `;

  t.deepEqual(a.tryParse(''), void 0);
  t.throws(() => a.tryParse('b'));
});

test('lang with a satisfies hole and a sequence', t => {
  let { a } = lang`
    a = !${ch => ch === 'a'} 'b';
  `;

  t.throws(() => a.tryParse('b'));
  t.throws(() => a.tryParse(''));
  t.deepEqual(a.tryParse('ab'), ['a', 'b']);
});

test('lang with a map', t => {
  let { a } = lang`
    a = 'a' > ${value => ({ value })} ;
  `;

  t.deepEqual(a.tryParse('a'), { value: 'a' });
});

test('map is under sequence', t => {
  let { a } = lang`
    a = 'a' 'b' > ${value => ({ value })} ;
  `;

  t.deepEqual(a.tryParse('ab'), { value: ['a', 'b'] });
});

test('map to the left of a sequence', t => {
  let { a } = lang`
    a = 'a' > ${value => ({ value })} 'b';
  `;

  t.deepEqual(a.tryParse('ab'), [{ value: 'a' }, 'b']);
});

test('map is under alternation', t => {
  let { a } = lang`
    a = 'a' | 'b' > ${value => ({ value })} ;
  `;

  t.deepEqual(a.tryParse('a'), 'a');
  t.deepEqual(a.tryParse('b'), { value: 'b' });
});

test('lang with multiple maps that associate to the left', t => {
  let { a } = lang`
    a = 'a' > ${value => ({ value })} > ${o => o.value + 'b'} ;
  `;

  t.deepEqual(a.tryParse('a'), 'ab');
});

test('lang with a chain', t => {
  let { a } = lang`
    a = 'a' >> ${value => succeed({ value })} ;
  `;

  t.deepEqual(a.tryParse('a'), { value: 'a' });
});

test('calc language', t => {
  const { multExpr } = lang`
    num = /[0-9]+/ > ${ch => parseInt(ch, 10)};

    addExpr = num '+' multExpr > ${([left, op, right]) => left + right}
            | num ;

    multExpr = addExpr '*' multExpr > ${([left, op, right]) => left * right}
            | addExpr ;
  `;

  t.deepEqual(multExpr.tryParse('1'), 1);
  t.deepEqual(multExpr.tryParse('12'), 12);
  t.deepEqual(multExpr.tryParse('1+1'), 2);
  t.deepEqual(multExpr.tryParse('1+1*2'), 3);
  t.deepEqual(multExpr.tryParse('1*1+2'), 3);
});
