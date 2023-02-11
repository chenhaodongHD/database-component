import {And, Any, Between, Equal, FindOptionsWhere, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not, Raw} from 'typeorm';

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
  raw = '$raw',
};

type WhereOperatorCondition = {
  [K in WhereOperators]?: any;
}

type Condition<T> = {
  [K in keyof T]?: T[K] | WhereOperatorCondition | Condition<T[K]>;
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
      case WhereOperators.raw:
        return Raw(value);
    }
  }

  static build<T>(value: WhereCondition<T>): FindOptionsWhere<T> | FindOptionsWhere<T>[] {
    if (value instanceof Array) {
      return value.map(v => this.build(v)) as FindOptionsWhere<T>[];
    }

    if (value instanceof Object) {
      const result = {};
      Object.entries(value).forEach(([key, v]) => {
        const keys = Object.keys(v);
        if (keys.length > 0 && keys.every(k => k.startsWith('$'))) {
          if (keys.length === 1) {
            result[key] = this.buildOperator(keys[0] as WhereOperators, v[keys[0]]);
          } else {
            result[key] = And(...keys.map(k => this.buildOperator(k as WhereOperators, v[k])));
          }
        } else {
          result[key] = this.build(v);
        }
      });
      return result;
    }

    return value;
  }

  static buildSQL<T>(value: WhereCondition<T>, table?: string): {sql: string, parameters: any[]} {
    if (value instanceof Array) {
      const results = value.map(v => this.buildSQL(v, table));
      return {
        sql: results.map(r => `(${r.sql})`).join(' or '),
        parameters: results.map(r => r.parameters).flat(),
      }
    }

    function getFullKey(key: string) {
      if (table) {
        return `${table}.${key}`;
      } else {
        return key;
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
              sql.push(`(${getFullKey(k)} between ? and ?)`);
              parameters.push(v[keys[0]][0], v[keys[0]][1]);
              break;
            case WhereOperators.eq:
              sql.push(`(${getFullKey(k)} = ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.iLike:
              sql.push(`(${getFullKey(k)} like ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.in:
              sql.push(`(${getFullKey(k)} in (?))`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.isNull:
              if (v[keys[0]]) {
                sql.push(`(${getFullKey(k)} is null)`);
                break;
              } else {
                sql.push(`(${getFullKey(k)} is not null)`);
                break;
              }
            case WhereOperators.lt:
              sql.push(`(${getFullKey(k)} < ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.lte:
              sql.push(`(${getFullKey(k)} <= ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.like:
              sql.push(`(${getFullKey(k)} like ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.gt:
              sql.push(`(${getFullKey(k)} > ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.gte:
              sql.push(`(${getFullKey(k)} >= ?)`);
              parameters.push(v[keys[0]]);
              break;
            case WhereOperators.not:
              sql.push(`(NOT(${getFullKey(k)} = ?))`);
              parameters.push(v[keys[0]]);
              break;
          }
        } else {
          sql.push(`(${getFullKey(k)} = ?)`);
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
