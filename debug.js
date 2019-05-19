import lang, { lex } from './src/lang';
import ContextWithHoles from './src/context-with-holes';

let { a } = lang`
  a = '\n';
`;

a.tryParse('a');
// console.dir(r);
