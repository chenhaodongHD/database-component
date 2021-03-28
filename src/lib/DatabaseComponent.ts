import {Component, IComponentOptions, Runtime, Utility} from '@sora-soft/framework';
import {createConnection, ConnectionOptions, Connection} from 'typeorm';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: ConnectionOptions;
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
      ...this.databaseOptions_.database,
      entities: this.entities_,
      synchronize: false,
      logging: false,
    });
    Runtime.frameLogger.success('component.database', { event: 'connect', target: Utility.hideKeys(this.databaseOptions_.database, ['password'] as any) });
  }

  protected async disconnect() {
    await this.connection_.close();
    this.connection_ = null;
    Runtime.frameLogger.success('component.database', { event: 'disconnect', target: Utility.hideKeys(this.databaseOptions_.database, ['password'] as any) });
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

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: any[];
  private connection_: Connection;
}

export {DatabaseComponent}
