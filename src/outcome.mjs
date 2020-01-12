export class Outcome {
  static of(result) {
    return new Success(result);
  }
  map(f) {
    mustImplement();
  }
  forEach(f) {
    mustImplement();
  }
  chain(f) {
    mustImplement();
  }
}
export class Success extends Outcome {
  constructor(result) {
    super();
    this.success = true;
    this.result = result;
  }

  // f: A => B
  // ret: Outcome<B>
  map(f) {
    return new Success(f(this.result));
  }

  // f: A => void
  // ret: Outcome<A>
  forEach(f) {
    f(this.result);
    return this;
  }

  // f: A => Outcome<B>
  // ret: Outcome<B>
  chain(f) {
    return f(this.result);
  }
}

export class Failure extends Outcome {
  constructor(error, subErrors) {
    super();
    this.success = false;
    this.result = error;
    this.subErrors = subErrors;
  }

  toString() {
    return `Failure { result: ${this.result}, subErrors: ${this.subErrors} }`;
  }

  // f: A => B
  // ret: Outcome<B>
  map(f) {
    return this;
  }

  // f: A => void
  // ret: Outcome<A>
  forEach(f) {
    return this;
  }

  // f: A => Outcome<B>
  // ret: Outcome<B>
  chain(f) {
    return this;
  }
}

function mustImplement() {
  throw new Error('Must implement');
}
