import test from 'ava';
import ContextWithHoles from '../src/context-with-holes';
import { lex } from '../src/lang';

test('can lex a hole', t => {
  t.snapshot(lex.tryParse(new ContextWithHoles(['a = ', ';'], ['b'])));
});
