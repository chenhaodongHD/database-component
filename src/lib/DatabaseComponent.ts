import {Component, IComponentOptions, Utility} from '@sora-soft/framework';
import {DataSourceOptions, EntityTarget, OrderByCondition, DataSource, ObjectLiteral} from 'typeorm';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';
import {SQLUtility} from './SQLUtility';
import {WhereBuilder, WhereCondition} from './WhereBuilder';

// tslint:disable-next-line
const pkg = require('../../package.json');

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: DataSourceOptions;
}

export interface IRelationsSqlOptions<Entity extends ObjectLiteral> {
  select?: string[];
  relations: string[];
  innerJoinKey: string;
  order?: OrderByCondition,
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export interface INoRelationsSqlOptions<Entity extends ObjectLiteral> {
  select?: string[];
  order?: OrderByCondition,
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export type ISqlOptions<Entity extends ObjectLiteral> = INoRelationsSqlOptions<Entity> & IRelationsSqlOptions<Entity>;

class DatabaseComponent extends Component {

  constructor(name: string, entities: any[]) {
    super(name);
    this.entities_ = entities;
    this.connected_ = false;
  }

  protected setOptions(options: IDatabaseComponentOptions) {
    this.databaseOptions_ = options;
  }

  protected async connect() {
    if (this.connected_)
      return;

    this.dataSource_ = new DataSource({
      name: this.name_,
      ...this.databaseOptions_.database,
      entities: this.entities_,
      synchronize: false,
      logging: false,
    });

    await this.dataSource_.initialize();
    this.connected_ = true;
  }

  protected async disconnect() {
    await this.dataSource_.destroy();
    this.dataSource_ = null;
    this.connected_ = false;
  }

  buildSQL<T extends ObjectLiteral>(entity: EntityTarget<T>, options: ISqlOptions<T>) {
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

      const {sql, parameters} = SQLUtility.prepareQuery(...innerJoinBuilder.getQueryAndParameters());
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

  get dataSource() {
    if (!this.dataSource_)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_CONNECTED, `ERR_COMPONENT_NOT_CONNECTED, name=${this.name_}`);

    if (!this.dataSource_.isInitialized)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_INITIALIZED, `ERR_COMPONENT_NOT_INITIALIZED, name=${this.name_}`);

    return this.dataSource_;
  }

  get manager() {
    if (!this.dataSource_)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_CONNECTED, `ERR_COMPONENT_NOT_CONNECTED, name=${this.name_}`);

    if (!this.dataSource_.isInitialized)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_INITIALIZED, `ERR_COMPONENT_NOT_INITIALIZED, name=${this.name_}`);

    return this.dataSource_.manager;
  }

  get entities() {
    return this.entities_;
  }

  get version() {
    return pkg.version;
  }

  get dataSourceOptions() {
    return this.databaseOptions_.database;
  }

  logOptions() {
    return Utility.hideKeys(this.databaseOptions_.database, ['password'] as any);
  }

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: any[];
  private connected_: boolean;
  private dataSource_: DataSource;
}

export {DatabaseComponent}
