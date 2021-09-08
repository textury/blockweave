import { BaseObjectInterface } from '../faces/utils/baseObject';
import { bufferToString, bufferTob64Url, b64UrlToString, b64UrlToBuffer } from './buffer';

export class BaseObject implements BaseObjectInterface {
  public get(field: string, options?: { decode: true; string: true }): string;
  public get(field: string, options: { decode: true; string: false }): Uint8Array;

  public get(field: string, options?: { string?: boolean; decode?: boolean }): string | Uint8Array {
    if (!Object.getOwnPropertyNames(this).includes(field)) {
      throw new Error(`Field "${field}" not found in object ${this.constructor.name}`);
    }

    // Handle fields that are Uint8Array.
    // To maintain compatibility, we encode them to b64url, only if the decode option is not specified.
    if (typeof this[field] === null) {
      throw new Error(`Field "${field}" not set.`);
    }

    if (this[field].constructor.name === 'Uint8Array') {
      if (options && options.decode && options.string) {
        return bufferToString(this[field]);
      }
      if (options && options.decode && !options.string) {
        return this[field];
      }

      return bufferTob64Url(this[field]);
    }

    if (options && options.decode === true) {
      if (options.string) {
        return b64UrlToString(this[field]);
      }
      return b64UrlToBuffer(this[field]);
    }

    return this[field];
  }
}
