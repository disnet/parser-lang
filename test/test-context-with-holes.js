import test from 'ava';
import ContextWithHoles from '../src/context-with-holes.mjs';
import Context from '../src/context.mjs';

test('no holes', t => {
  let c = new ContextWithHoles(['abc'], []);

  t.is(c.next().value, 'a');
  t.is(c.next().value, 'b');
  t.is(c.next().value, 'c');
  t.true(c.next().done);
});

test('unmatched number of parts and holes', t => {
  t.throws(() => new ContextWithHoles([], []));
  t.throws(() => new ContextWithHoles(['abc'], [() => null]));
  t.throws(() => new ContextWithHoles([], [() => null]));
});

test('empty strings with a single hole', t => {
  let c = new ContextWithHoles(['', ''], [() => 'b']);

  t.is(c.next().value[ContextWithHoles.hole](), 'b');
  t.true(c.next().done);
});

test('single strings with a single hole', t => {
  let c = new ContextWithHoles(['a', 'c'], [() => 'b']);

  t.is(c.next().value, 'a');
  t.is(c.next().value[ContextWithHoles.hole](), 'b');
  t.is(c.next().value, 'c');
  t.true(c.next().done);
});

test('regex matching in the middle of a part', t => {
  let c = new ContextWithHoles(['abc', 'c'], [() => 'b']);

  t.is(c.next().value, 'a');
  t.is(c[Context.regex](/b/).value, 'b');
  t.is(c.next().value, 'c');
  t.is(c.next().value[ContextWithHoles.hole](), 'b');
  t.is(c.next().value, 'c');
  t.true(c.next().done);
});

test('regex matching to the end of a part', t => {
  let c = new ContextWithHoles(['abc', 'c'], [() => 'b']);

  t.is(c.next().value, 'a');
  t.is(c[Context.regex](/bc/).value, 'bc');
  t.is(c.next().value[ContextWithHoles.hole](), 'b');
  t.is(c.next().value, 'c');
  t.true(c.next().done);
});
