import Context from './context';

const stateSymbol = Symbol('StateContext.state');
export default class StateContext {
  constructor(context, state = {}) {
    this.context = context;
    this.state = state;
  }

  static from(arrayLike, state = {}) {
    return new StateContext(Context.from(arrayLike), state);
  }

  [stateSymbol]() {
    return this.state;
  }

  next() {
    return this[Context.next]();
  }

  [Context.next]() {
    return this.context[Context.next]();
  }

  [Context.regex](re) {
    return this.context[Context.regex](re);
  }

  [Context.clone]() {
    return new StateContext(this.context[Context.clone](), this.state);
  }

  [Symbol.iterator]() {
    return this;
  }
}
StateContext.state = stateSymbol;
