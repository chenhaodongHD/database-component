import {Component, IComponentOptions} from '@sora-soft/framework';
import {DataSourceOptions, EntityTarget, DataSource, ObjectLiteral, EntitySchema} from 'typeorm';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';
import {SQLUtility} from './SQLUtility';
import {WhereBuilder, WhereCondition} from './WhereBuilder';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const pkg: {version: string} = require('../../package.json');

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: DataSourceOptions;
}

export interface IRelationsSqlOptions<Entity extends ObjectLiteral> {
  select?: string[];
  relations: string[];
  innerJoinKey: string;
  order?: [string, 'ASC' | 'DESC'];
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export interface INoRelationsSqlOptions<Entity extends ObjectLiteral> {
  select?: string[];
  order?: [string, 'ASC' | 'DESC'];
  offset?: number;
  limit?: number;
  where?: WhereCondition<Entity>;
}

export type ISqlOptions<Entity extends ObjectLiteral> = INoRelationsSqlOptions<Entity> & IRelationsSqlOptions<Entity>;

class DatabaseComponent extends Component {
  constructor(entities: EntitySchema<unknown>[]) {
    super();
    this.entities_ = entities;
    this.connected_ = false;
  }

  protected setOptions(options: IDatabaseComponentOptions) {
    this.databaseOptions_ = options;
  }

  protected async connect() {
    if (this.connected_) return;

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
    if (!this.dataSource_)
      return;
    await this.dataSource_.destroy();
    this.dataSource_ = null;
    this.connected_ = false;
  }

  buildSQL<T extends ObjectLiteral>(
    entity: EntityTarget<T>,
    options: ISqlOptions<T>
  ) {
    let sqlBuilder = this.manager
      .getRepository(entity)
      .createQueryBuilder('self');
    if (options.relations && options.relations.length) {
      const innerJoinBuilder = this.manager
        .getRepository(entity)
        .createQueryBuilder();
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
        innerJoinBuilder.orderBy(options.order[0], options.order[1]);
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
        sqlBuilder = sqlBuilder.orderBy(options.order[0], options.order[1]);
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
    return pkg.version ;
  }

  get dataSourceOptions() {
    return this.databaseOptions_.database;
  }

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: EntitySchema<unknown>[];
  private connected_: boolean;
  private dataSource_: DataSource | null;
}

export {DatabaseComponent};
