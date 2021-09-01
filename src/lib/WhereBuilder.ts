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

  static build<T>(value: WhereCondition<T>): Condition<T> | Condition<T>[] {
    if (Array.isArray(value)) {
      return value.map(v => this.build(v)) as Condition<T>[];
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

  static buildSQL<T>(value: WhereCondition<T>): {sql: string, parameters: any[]} {
    if (Array.isArray(value)) {
      const results = value.map(v => this.buildSQL(v));
      return {
        sql: results.map(r => `(${r.sql})`).join(' or '),
        parameters: results.map(r => r.parameters).flat(),
      }
    }

    const sql: string[] = [];
    const parameters: any[] = [];
    if (value instanceof Object) {
      Object.entries(value).map(([k, v]) => {
        const keys = Object.keys(v);

        if (keys.length === 1 && keys[0].startsWith('$')) {
          switch (keys[0]) {
            case WhereOperators.between:
              sql.push(`(${k} between ? and ?)`);
              parameters.push(v[keys[0]][0], v[keys[0]][1]);
              break;
            case WhereOperators.eq:
              sql.push(`(${k} = ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.iLike:
              sql.push(`(${k} like ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.in:
              sql.push(`(${k} in (?))`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.isNull:
              if (v[keys[0]]) {
                sql.push(`(${k} is null)`);
                break;
              } else {
                sql.push(`(${k} is not null)`);
                break;
              }
            case WhereOperators.lt:
              sql.push(`(${k} < ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.lte:
              sql.push(`(${k} <= ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.like:
              sql.push(`(${k} like ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.gt:
              sql.push(`(${k} > ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.gte:
              sql.push(`(${k} >= ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.not:
              sql.push(`(NOT(${k} = ?))`);
              parameters.push(v[keys[0]]);
              break;
          }
        } else {
          sql.push(`(${k} = ?)`);
          parameters.push(v);
        }
      });
    }

    return {
      sql: sql.join(' and '),
      parameters,
    }
  }
}

export {WhereBuilder}
