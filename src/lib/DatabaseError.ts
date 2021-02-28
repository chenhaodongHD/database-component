import {ExError} from '@sora-soft/framework';
import {DatabaseErrorCode} from './DatabaseErrorCode';

class DatabaseError extends ExError {
  constructor(code: DatabaseErrorCode, message: string) {
    super(code, message);
    Object.setPrototypeOf(this, DatabaseError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}


export {DatabaseError}
