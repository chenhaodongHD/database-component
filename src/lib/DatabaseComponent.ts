import {Component, IComponentOptions, Runtime, Utility} from '@sora-soft/framework';
import {createConnection, ConnectionOptions, Connection, EntityTarget, OrderByCondition} from 'typeorm';
import {MysqlConnectionOptions} from 'typeorm/driver/mysql/MysqlConnectionOptions';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';
import {WhereBuilder, WhereCondition} from './WhereBuilder';

// tslint:disable-next-line
const pkg = require('../../package.json');

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: ConnectionOptions;
}

export interface ISqlOptions<Entity = any> {
  select?: string[];
  relations?: string[];
  order?: OrderByCondition,
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

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

  buildSQL<T = any>(entity: EntityTarget<T>, options: ISqlOptions<T>) {
    let sqlBuilder = this.manager.getRepository(entity).createQueryBuilder('self');
    if (options.relations) {
      options.relations.forEach((relation) => {
        sqlBuilder = sqlBuilder.leftJoinAndSelect(`self.${relation}`, relation);
      });
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

  logOptions() {
    return Utility.hideKeys(this.databaseOptions_.database, ['password'] as any);
  }

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: any[];
  private connection_: Connection;
}

export {DatabaseComponent}
