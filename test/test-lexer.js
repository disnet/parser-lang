import test from 'ava';
import ContextWithHoles from '../src/context-with-holes.mjs';
import { lex } from '../src/lang.mjs';

test('can lex a hole', t => {
  t.snapshot(lex.tryParse(new ContextWithHoles(['a = ', ';'], ['b'])));
});
