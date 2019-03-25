import test from 'ava';
import Parser, { item, empty, satisfy, lift2, sequence, alternatives, infixl, infixr, token, regex } from './index';

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

test('Parser#many', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);

  t.true(one.many().parse([2]).success);
  t.deepEqual(
    one.many().parse([2]).result.value, 
    []
  );

  t.deepEqual(
    one.many().parse([1, 2]).result.value, 
    ['1']
  );

  t.deepEqual(
    one.many().parse([1, 1, 2]).result.value, 
    ['1', '1']
  );
});

test('times', t => {
  let one = satisfy(x => x === 1);

  t.false(one.times(1).parse([]).success);
  t.false(one.times(1).parse([1, 1]).success);

  t.true(one.times(1).parse([1]).success);

  t.false(one.times(1, 3).parse([]).success);
  t.false(one.times(1, 3).parse([1, 1, 1, 1]).success);

  t.true(one.times(1, 3).parse([1]).success);
  t.true(one.times(1, 3).parse([1, 1]).success);
  t.true(one.times(1, 3).parse([1, 1, 1]).success);
})

test('atMost', t => {
  let one = satisfy(x => x === 1);

  t.false(one.atMost(2).parse([1, 1, 1]).success)

  t.true(one.atMost(2).parse([1, 1]).success)
  t.true(one.atMost(2).parse([1]).success)
  t.true(one.atMost(2).parse([]).success)
});

test('atLeast', t => {
  let one = satisfy(x => x === 1);

  t.false(one.atLeast(2).parse([]).success)
  t.false(one.atLeast(2).parse([1]).success)

  t.true(one.atLeast(2).parse([1, 1]).success)
  t.true(one.atLeast(2).parse([1, 1, 1]).success)

});

test('sepBy1', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let comma = satisfy(x => x === ',');

  t.false(one.sepBy1(comma).parse([]).success);
  t.false(one.sepBy1(comma).parse([1]).success);
  t.false(one.sepBy1(comma).parse([1, 1]).success);

  t.true(one.sepBy1(comma).parse([1, ',', 1]).success);
  t.deepEqual(
    one.sepBy1(comma).parse([1, ',', 1]).result.value,
    ['1', '1']
  );
  t.deepEqual(
    one.sepBy1(comma).parse([1, ',', 1, ',']).result.value,
    ['1', '1']
  );
  t.deepEqual(
    one.sepBy1(comma).parse([1, ',', 1, ',', 1]).result.value,
    ['1', '1', '1']
  );
});

test('sepBy', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let comma = satisfy(x => x === ',');

  t.true(one.sepBy(comma).parse([]).success);
  t.deepEqual(
    one.sepBy(comma).parse([]).result.value,
    []
  );
  t.true(one.sepBy(comma).parse([1]).success);
  t.deepEqual(
    one.sepBy(comma).parse([1]).result.value,
    []
  );
  t.true(one.sepBy(comma).parse([1, 1]).success);
  t.deepEqual(
    one.sepBy(comma).parse([1, 1]).result.value,
    []
  );

  t.true(one.sepBy(comma).parse([1, ',', 1]).success);
  t.deepEqual(
    one.sepBy(comma).parse([1, ',', 1]).result.value,
    ['1', '1']
  );
  t.deepEqual(
    one.sepBy(comma).parse([1, ',', 1, ',']).result.value,
    ['1', '1']
  );
  t.deepEqual(
    one.sepBy(comma).parse([1, ',', 1, ',', 1]).result.value,
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

test('alternatives', t => {
  let one = satisfy(x => x === 1).map(x => '' + x);
  let two = satisfy(x => x === 2).map(x => '' + x);

  t.false(alternatives(one, two).parse([]).success);
  t.false(alternatives(one, two).parse([3]).success);
  t.false(alternatives(one, two).parse([3, 1]).success);

  t.true(alternatives(one, two).parse([1]).success);
  t.deepEqual(
    alternatives(one, two).parse([1]).result.value,
    '1'
  );
  t.deepEqual(
    alternatives(one, two).parse([2]).result.value,
    '2'
  );
  t.deepEqual(
    alternatives(one, two).parse([2, 1]).result.value,
    '2'
  );

});

test('operator', t => {
  let number = satisfy(x => typeof x === 'number');
  let basicOperators = [{
    type: 'left',
    prec: 2,
    parser: token('+'),
    action(left, right) {
      return left + right;
    }
  }, {
    type: 'left',
    prec: 3,
    parser: token('*'),
    action(left, right) {
      return left * right;
    }
  }, {
    type: 'prefix',
    prec: 1,
    parser: token('-'),
    action(operand) {
      return -operand;
    }
  }, {
    type: 'right',
    prec: 3,
    parser: token('/'),
    action(left, right) {
      return left / right;
    }
  }]

  t.false(number.operators(basicOperators).parse([]).success);
  t.false(number.operators(basicOperators).parse(['1']).success);

  t.true(number.operators(basicOperators).parse([1]).success);
  t.is(
    number.operators(basicOperators).parse([1, '+', 2]).result.value,
    3
  );
  t.is(
    number.operators(basicOperators).parse([1, '+', 2, '*', 3]).result.value,
    7
  );
  t.is(
    number.operators(basicOperators).parse([2, '*', 3, '+', 1]).result.value,
    7
  );
  t.is(
    number.operators(basicOperators).parse([10, '/', 5, '/', 2]).result.value,
    4
  );
  t.is(
    number.operators(basicOperators).parse([1, '+', '-', 2]).result.value,
    -1
  );
  t.is(
    number.operators(basicOperators).parse(['-', 2, '+', 1]).result.value,
    -1
  );
  t.is(
    number.operators([{
      type: 'left',
      prec: 2,
      parser: token('+'),
      action(left, right) {
        return left + right;
      }
    }, {
      type: 'prefix',
      prec: 3, // bigger than plus prec
      parser: token('-'),
      action(operand) {
        return -operand;
      }

    }]).parse(['-', 2, '+', 1]).result.value,
    -3
  );
});

test('CSV parser', t => {
  let comma = token(',');
  let dquote = token('"');
  let textdata = regex(/[\u{20}-\u{21}]|[\u{23}-\u{2B}]|[\u{2D}-\u{7E}]/u);
  let nonescaped = textdata.many().map(chars => chars.join(''));

  let escaped = sequence(
    dquote,
    alternatives(
      dquote.then(dquote),
      textdata,
      comma,
    ).many().map(chars => chars.join('')),
    dquote,
  ).map(([q1, f, q2]) => f);

  let field = escaped.or(nonescaped);


  let record = sequence(
    field,
    sequence(comma, field).map(([c, f]) => f).many(),
  );

  t.deepEqual(
    record.parse('foo,bar').result.value,
    ['foo', 'bar']
  );

  t.deepEqual(
    record.parse('"foo","bar"').result.value,
    ['foo', 'bar']
  );

  t.deepEqual(
    record.parse('"foo","bar,baz"').result.value,
    ['foo', 'bar,baz']
  );

  t.deepEqual(
    record.parse('""""').result.value,
    ['"']
  );
  
  t.deepEqual(
    record.parse('"foo","bar,baz"""').result.value,
    ['foo', 'bar,baz"']
  );
})