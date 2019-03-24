import test from 'ava';
import { item, empty } from './index';

test('taking an item from array likes', t => {
  t.true(item().parse('123').success);
  t.true(item().parse([1, 2, 3]).success);
  t.true(item().parse({ 0: 1, length: 1}).success);

  t.false(item().parse('').success);
  t.false(item().parse([]).success);
  t.false(item().parse({ length: 0 }).success);
});

test('matching empty from array likes', t => {
  t.true(empty().parse('').success);
  t.true(empty().parse([]).success);
  t.true(empty().parse({ length: 0 }).success);

  t.false(empty().parse('123').success);
  t.false(empty().parse([1, 2, 3]).success);
  t.false(empty().parse({ 0: 1, length: 1}).success);
})