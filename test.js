import test from 'ava';
import Parser, { item, empty, satisfy, many, many1, sepBy1, sepBy, lift2, sequence, disj, infixl, infixr } from './index';

test('item() from array-likes', t => {
  t.true(item().parse('123').success);
  t.true(item().parse([1, 2, 3]).success);
  t.true(item().parse({ 0: 1, length: 1}).success);

  t.false(item().parse('').success);
  t.false(item().parse([]).success);
  t.false(item().parse({ length: 0 }).success);
});

test('empty() from array-likes', t => {
  t.true(empty().parse('').success);
  t.true(empty().parse([]).success);
  t.true(empty().parse({ length: 0 }).success);

  t.false(empty().parse('123').success);
  t.false(empty().parse([1, 2, 3]).success);
  t.false(empty().parse({ 0: 1, length: 1}).success);
});

test('satisfy() from array-likes', t => {
  t.true(satisfy(x => x === 1).parse([1]).success);
  t.true(satisfy(x => x === '1').parse('1').success);
  t.true(satisfy(x => x === 1).parse({ 0: 1, length: 1}).success);

  t.false(satisfy(x => x === 1).parse([2]).success);
  t.false(satisfy(x => x === '1').parse('2').success);
  t.false(satisfy(x => x === 1).parse({ 0: 2, length: 1}).success);
});

test('Parser#map', t => {
  t.is(
    Parser.of(1).map(x => x + 1).parse([]).result.value,
    2);
});

test('Parser#chain', t => {
  t.false(Parser.of(1).chain(x => Parser.zero()).parse([]).success);

  t.is(
    Parser.of(1).chain(x => Parser.of(x + 1)).parse([]).result.value,
    2);
});

test('Parser#ap', t => {
  t.is(
    Parser.of(1).ap(Parser.of(x => x + 1)).parse([]).result.value,
    2);
});

test('Parser#alt', t => {
  let one = satisfy(x => x === 1);
  let two = satisfy(x => x === 2);

  t.true(one.alt(two).parse([1]).success);
  t.true(one.alt(two).parse([2]).success);
  t.false(one.alt(two).parse([3]).success);
  t.false(two.alt(one).parse([3]).success);
})

test('many', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);

  t.true(many(one).parse([2]).success);
  t.deepEqual(
    many(one).parse([2]).result.value, 
    []
  );

  t.deepEqual(
    many(one).parse([1, 2]).result.value, 
    ['1']
  );

  t.deepEqual(
    many(one).parse([1, 1, 2]).result.value, 
    ['1', '1']
  );
});

test('many1', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);

  t.false(many1(one).parse([2]).success);

  t.deepEqual(
    many1(one).parse([1, 2]).result.value, 
    ['1']
  );

  t.deepEqual(
    many1(one).parse([1, 1, 2]).result.value, 
    ['1', '1']
  );
});

test('sepBy1', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let comma = satisfy(x => x === ',');

  t.false(sepBy1(one, comma).parse([]).success);
  t.false(sepBy1(one, comma).parse([1]).success);
  t.false(sepBy1(one, comma).parse([1, 1]).success);

  t.true(sepBy1(one, comma).parse([1, ',', 1]).success);
  t.deepEqual(
    sepBy1(one, comma).parse([1, ',', 1]).result.value,
    ['1', '1']
  );
  t.deepEqual(
    sepBy1(one, comma).parse([1, ',', 1, ',']).result.value,
    ['1', '1']
  );
  t.deepEqual(
    sepBy1(one, comma).parse([1, ',', 1, ',', 1]).result.value,
    ['1', '1', '1']
  );
});

test('sepBy', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let comma = satisfy(x => x === ',');

  t.true(sepBy(one, comma).parse([]).success);
  t.deepEqual(
    sepBy(one, comma).parse([]).result.value,
    []
  );
  t.true(sepBy(one, comma).parse([1]).success);
  t.deepEqual(
    sepBy(one, comma).parse([1]).result.value,
    []
  );
  t.true(sepBy(one, comma).parse([1, 1]).success);
  t.deepEqual(
    sepBy(one, comma).parse([1, 1]).result.value,
    []
  );

  t.true(sepBy(one, comma).parse([1, ',', 1]).success);
  t.deepEqual(
    sepBy(one, comma).parse([1, ',', 1]).result.value,
    ['1', '1']
  );
  t.deepEqual(
    sepBy(one, comma).parse([1, ',', 1, ',']).result.value,
    ['1', '1']
  );
  t.deepEqual(
    sepBy(one, comma).parse([1, ',', 1, ',', 1]).result.value,
    ['1', '1', '1']
  );
});

test('lift2', t => {
  let f = lift2((x, y) => x + y)

  t.true(f(Parser.of(1), Parser.of(2)).parse([]).success);
  t.deepEqual(
    f(Parser.of(1), Parser.of(2)).parse([]).result.value,
    3
  );
});

test('sequence', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let two = satisfy(x => x === 2).map(x => '' + x);

  t.false(sequence(one, two).parse([]).success);
  t.false(sequence(one, two).parse([1]).success);

  t.true(sequence(one, two).parse([1, 2]).success);
  t.deepEqual(
    sequence(one, two).parse([1, 2]).result.value,
    ['1', '2']
  );
  t.true(sequence(one, two).parse([1, 2, 3]).success);
  t.deepEqual(
    sequence(one, two).parse([1, 2, 3]).result.value,
    ['1', '2']
  );
})

test('disj', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let two = satisfy(x => x === 2).map(x => '' + x);

  t.false(disj(one, two).parse([]).success);
  t.false(disj(one, two).parse([3]).success);
  t.false(disj(one, two).parse([3, 1]).success);

  t.true(disj(one, two).parse([1]).success);
  t.deepEqual(
    disj(one, two).parse([1]).result.value,
    '1'
  );
  t.deepEqual(
    disj(one, two).parse([2]).result.value,
    '2'
  );
  t.deepEqual(
    disj(one, two).parse([2, 1]).result.value,
    '2'
  );

});

test('infixl', t => {
  let minus = satisfy(x => x === '-');
  let num = satisfy(x => typeof x === 'number');

  t.is(
    infixl(num, minus.map(() => (x, y) => x - y)).parse([0, '-', 1, '-', 1]).result.value,
    -2
  );
});

test('infixr', t => {
  let minus = satisfy(x => x === '-');
  let num = satisfy(x => typeof x === 'number');

  t.is(
    infixr(num, minus.map(() => (x, y) => x - y)).parse([0, '-', 1, '-', 1]).result.value,
    0
  );
})