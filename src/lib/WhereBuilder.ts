import {Any, Between, Equal, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not} from 'typeorm';

export enum WhereOperators {
  any = '$any',
  between = '$between',
  eq = '$eq',
  iLike = '$iLike',
  in = '$in',
  isNull = '$isNull',
  lt = '$lt',
  lte = '$lte',
  like = '$like',
  gt = '$gt',
  gte = '$gte',
  not = '$not',
};

type WhereOperatorCondition = {
  [K in WhereOperators]?: any;
}

type Condition<T> = {
  [K in keyof T]?: T[K] | WhereOperatorCondition;
}

export type WhereCondition<T> = Condition<T> | Array<Condition<T>>;

class WhereBuilder {
  private static buildOperator(operator: WhereOperators, value: any) {
    switch (operator) {
      case WhereOperators.any:
        return Any(value);
      case WhereOperators.between:
        return Between(value[0], value[1]);
      case WhereOperators.eq:
        return Equal(value);
      case WhereOperators.iLike:
        return ILike(value);
      case WhereOperators.in:
        return In(value);
      case WhereOperators.isNull:
        if (value) {
          return IsNull();
        } else {
          return Not(IsNull());
        }
      case WhereOperators.lt:
        return LessThan(value);
      case WhereOperators.lte:
        return LessThanOrEqual(value);
      case WhereOperators.like:
        return Like(value);
      case WhereOperators.gt:
        return MoreThan(value);
      case WhereOperators.gte:
        return MoreThanOrEqual(value);
      case WhereOperators.not:
        return Not(this.build(value));
    }
  }

  static build<T>(value: WhereCondition<T>) {
    if (Array.isArray(value)) {
      return value.map(v => this.build(v));
    }

    if (value instanceof Object) {
      const result = {};
      Object.entries(value).forEach(([k, v]) => {
        const keys = Object.keys(v);
        if (keys.length == 1 && keys[0].startsWith('$')) {
          result[k] = this.buildOperator(keys[0] as WhereOperators, v[keys[0]]);
        } else {
          result[k] = this.build(v);
        }
      });
      return result;
    }

    return value;
  }
}

export {WhereBuilder}
