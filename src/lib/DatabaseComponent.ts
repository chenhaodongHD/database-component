import {Component, IComponentOptions, Runtime} from '@sora-soft/framework';
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
      synchronize: true,
      logging: false,
    });
    Runtime.frameLogger.success('component.database', { event: 'connect', target: this.databaseOptions_.database });
  }

  protected async disconnect() {
    await this.connection_.close();
    this.connection_ = null;
    Runtime.frameLogger.success('component.database', { event: 'disconnect', target: this.databaseOptions_.database });
  }

  get connection() {
    if (!this.connection_)
      throw new DatabaseError(DatabaseErrorCode.ERR_COMPONENT_NOT_CONNECTED, `ERR_COMPONENT_NOT_CONNECTED, name=${this.name_}`);

    return this.connection_;
  }

  get manager() {
    return this.connection.manager;
  }

  private databaseOptions_: IDatabaseComponentOptions;
  private entities_: any[];
  private connection_: Connection;
}

export {DatabaseComponent}
