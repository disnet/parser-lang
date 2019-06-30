import lang, { lex } from './src/lang';
import ContextWithHoles from './src/context-with-holes';

const { multExpr } = lang`
    num = /[0-9]+/ > ${ch => parseInt(ch, 10)};

    addExpr = num '+' multExpr > ${([left, op, right]) => left + right}
            | num ;

    multExpr = addExpr '*' multExpr > ${([left, op, right]) => left * right}
            | addExpr ;
  `;
multExpr.tryParse('1 + 1');
// console.dir(r);
