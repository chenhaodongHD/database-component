import {Component, IComponentOptions, Runtime, Utility} from '@sora-soft/framework';
import {createConnection, ConnectionOptions, Connection, EntityTarget, OrderByCondition, QueryBuilder} from 'typeorm';
import {MysqlConnectionOptions} from 'typeorm/driver/mysql/MysqlConnectionOptions';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';
import {WhereBuilder, WhereCondition} from './WhereBuilder';

// tslint:disable-next-line
const pkg = require('../../package.json');

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: ConnectionOptions;
}

export interface IRelationsSqlOptions<Entity = any> {
  select?: string[];
  relations: string[];
  innerJoinKey: string;
  order?: OrderByCondition,
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export interface INoRelationsSqlOptions<Entity = any> {
  select?: string[];
  order?: OrderByCondition,
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export type ISqlOptions<Entity = any> = INoRelationsSqlOptions<Entity> & IRelationsSqlOptions<Entity>;

class DatabaseComponent extends Component {

  constructor(name: string, entities: any[]) {
    super(name);
    this.entities_ = entities;
  }

  protected setOptions(options: IDatabaseComponentOptions) {
    this.databaseOptions_ = options;
  }

  protected async connect() {
    this.connection_ = await createConnection({
      name: this.name_,
      ...this.databaseOptions_.database,
      entities: this.entities_,
      synchronize: false,
      logging: false,
    });
  }

  protected async disconnect() {
    await this.connection_.close();
    this.connection_ = null;
  }

  prepareQuery(query: QueryBuilder<any>) {
    const [sql, params] = query.getQueryAndParameters();
    let finalSQL = sql;
    const parameters: any = {};

    const m = sql.match(/\?/g);
    if (m === null) {
      return {sql, parameters};
    }
    let index = 0;
    let value = null;
    for (const m0 of m) {
      switch (typeof params[index]) {
        case 'string':
          value = `'${params[index]}'`;
          break;

        default:
          value = params[index];
          break;
      }

      finalSQL = finalSQL.replace(m0, `:value${index}`);
      parameters[`value${index}`] = params[index];
      index++;
    }

    return {
      sql: finalSQL,
      parameters,
    };
  };

  buildSQL<T = any>(entity: EntityTarget<T>, options: ISqlOptions<T>) {
    let sqlBuilder = this.manager.getRepository(entity).createQueryBuilder('self');
    if (options.relations && options.relations.length) {
      const innerJoinBuilder = this.manager.getRepository(entity).createQueryBuilder();
      innerJoinBuilder.select(options.innerJoinKey);
      if (options.limit) {
        innerJoinBuilder.limit(options.limit);
      }
      if (options.offset) {
        innerJoinBuilder.offset(options.offset);
      }
      if (options.where) {
        innerJoinBuilder.where(WhereBuilder.build(options.where));
      }
      if (options.order) {
        innerJoinBuilder.orderBy(options.order);
      }

      const {sql, parameters} = this.prepareQuery(innerJoinBuilder);
      sqlBuilder.innerJoin(`(${sql})`, 'inner', `inner.${options.innerJoinKey} = self.${options.innerJoinKey}`);
      sqlBuilder.setParameters(parameters);

      options.relations.forEach((relation) => {
        sqlBuilder = sqlBuilder.leftJoinAndSelect(`self.${relation}`, relation);
      });
    } else {
      if (options.where) {
        sqlBuilder = sqlBuilder.where(WhereBuilder.build(options.where));
      }
      if (options.order) {
        sqlBuilder = sqlBuilder.orderBy(options.order);
      }
      if (options.limit) {
        sqlBuilder = sqlBuilder.limit(options.limit);
      }
      if (options.offset) {
        sqlBuilder = sqlBuilder.offset(options.offset);
      }
    }
    if (options.select) {
      const select = options.select.map((s) => {
        if (s.includes('.')) {
          return s;
        } else {
          return `self.${s}`;
        }
      });
      sqlBuilder = sqlBuilder.select(select);
    }

    return sqlBuilder;
  }

  get connection() {
    if (!this.connection_)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_CONNECTED, `ERR_COMPONENT_NOT_CONNECTED, name=${this.name_}`);

    return this.connection_;
  }

  get manager() {
    if (!this.connection_)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_CONNECTED, `ERR_COMPONENT_NOT_CONNECTED, name=${this.name_}`);

    return this.connection.manager;
  }

  get entities() {
    return this.entities_;
  }

  get version() {
    return pkg.version;
  }

  get connectionOptions() {
    return this.databaseOptions_.database;
  }

  logOptions() {
    return Utility.hideKeys(this.databaseOptions_.database, ['password'] as any);
  }

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: any[];
  private connection_: Connection;
}

export {DatabaseComponent}
