import {Component, IComponentOptions, Runtime} from '@sora-soft/framework';
import {createConnection, ConnectionOptions, Connection} from 'typeorm';
import {DatabaseError} from './DatabaseError';
import {DatabaseErrorCode} from './DatabaseErrorCode';

export interface IDatabaseComponentOptions extends IComponentOptions {
  database: ConnectionOptions;
  // typeorm 直接用 Class 作为 entities，在这里没有办法指定类型
  entities: Array<any>;
}

class DatabaseComponent extends Component {

  protected setOptions(options: IDatabaseComponentOptions) {
    this.databaseOptions_ = options;
  }

  protected async connect() {
    this.connection_ = await createConnection({
      ...this.databaseOptions_.database,
      entities: this.databaseOptions_.entities,
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

  private databaseOptions_: IDatabaseComponentOptions;
  private connection_: Connection;
}

export {DatabaseComponent}
