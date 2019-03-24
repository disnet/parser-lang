import test from 'ava';
import { item, empty, satisfy } from './index';

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
})