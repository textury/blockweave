import * as B64js from '../utils/b64';
import { TagInterface } from '../faces/lib/tag';
import { TransactionInterface } from '../faces/lib/transaction';
import { BaseObject } from '../utils/baseObject';
import { b64UrlToBuffer, bufferTob64Url, concatBuffers, stringToB64Url, stringToBuffer } from '../utils/buffer';
import { Tag } from './tag';
import Merkle from '../utils/merkle';
import deepHash from '../utils/deepHash';

export default class Transaction extends BaseObject implements TransactionInterface {
  public readonly format: number = 2;
  public id: string = '';
  public readonly lastTx: string = '';
  public owner: string = '';
  public tags: TagInterface[] = [];
  public readonly target: string = '';
  public readonly quantity: string = '0';
  public readonly dataSize: string = '0';
  public data: Uint8Array = new Uint8Array();
  public dataRoot: string = '';
  public reward: string = '0';
  public signature: string = '';

  private merkle: Merkle;

  // private _raw: TransactionInterface = {};

  constructor(attributes: Partial<TransactionInterface> = {}) {
    super();
    Object.assign(this, attributes);

    // If something passes in a Tx that has been toJSON'ed and back,
    // or where the data was filled in from /tx/data endpoint.
    // data will be b64url encoded, so decode it.
    if(typeof this.data === 'string') {
      this.data = b64UrlToBuffer(this.data);
    }

    if(attributes.tags) {
      this.tags = attributes.tags.map(tag => new Tag(tag.name, tag.value));
    }

    this.merkle = new Merkle();
  }

  /**
   * Add a new tag to this transaction.
   * @param  {string} name
   * @param  {string} value
   */
  public addTag(name: string, value: string) {
    this.tags.push(new Tag(
      stringToB64Url(name),
      stringToB64Url(value)
    ));
  }

  /**
   * Set the transaction to a new owner.
   * @param  {string} newOwner
   */
  public setOwner(newOwner: string) {
    this.owner = newOwner;
  }

  /**
   * Set the signature of the transaction to a new one.
   * @param {string} id
   * @param {string} owner
   * @param {Tag[]} tags
   * @param {string} signature
   */
  public setSignature({id, owner, tags, signature}: {id: string, owner: string, tags: TagInterface[], signature: string}) {
    this.id = id;
    this.owner = owner;
    if(tags) {
      this.tags = tags;
    }
    this.signature = signature;
  }
  /**
   * Prepare the data as chunks.
   * @param  {Uint8Array} data
   */
  public async prepareChunks(data: Uint8Array) {
    if(!this.chunks && data.byteLength > 0) {
      this.chunks = await this.merkle.generateTransactionChunks(data);
      this.data_root = bufferTob64Url(this.chunks.data_root);
    }

    if(!this.chunks && data.byteLength === 0) {
      this.chunks = {
        chunks: [],
        data_root: new Uint8Array(),
        proofs: [],
      };
      this.data_root = '';
    }
  }
  /**
   * Returns a chunk in a format suitable for posting to /chunk.
   * @param  {number} idx
   * @param  {Uint8Array} data
   * @returns Chunk data formated for deploy.
   */
  public getChunk(idx: number, data: Uint8Array): {
      data_root: any;
      data_size: any;
      data_path: string;
      offset: any;
      chunk: string;
  } {
    if(!this.chunks) {
      this.prepareChunks(data);
    }
    const proof = this.chunks.proofs[idx];
    const chunk = this.chunks.chunks[idx];

    return {
      data_root: this.data_root,
      data_size: this.data_size,
      data_path: bufferTob64Url(proof.proof),
      offset: proof.offset.toString(),
      chunk: bufferTob64Url(data.slice(chunk.minByteRange, chunk.maxByteRange)),
    };
  }

  public async getSignatureData(): Promise<Uint8Array> {
    switch (this.format) {
      case 1:
        const tags = this.tags.reduce((accumulator: Uint8Array, tag: Tag) => {
          return concatBuffers([
            accumulator,
            tag.get("name", { decode: true, string: false }),
            tag.get("value", { decode: true, string: false }),
          ]);
        }, new Uint8Array());

        return concatBuffers([
          this.get("owner", { decode: true, string: false }),
          this.get("target", { decode: true, string: false }),
          this.get("data", { decode: true, string: false }),
          stringToBuffer(this.quantity),
          stringToBuffer(this.reward),
          this.get("last_tx", { decode: true, string: false }),
          tags,
        ]);
      case 2:
        await this.prepareChunks(this.data);

        const tagList = this.tags.map((tag) => [
          tag.get("name", { decode: true, string: false }),
          tag.get("value", { decode: true, string: false }),
        ]);

        return await deepHash([
          stringToBuffer(this.format.toString()),
          this.get("owner", { decode: true, string: false }),
          this.get("target", { decode: true, string: false }),
          stringToBuffer(this.quantity),
          stringToBuffer(this.reward),
          this.get("last_tx", { decode: true, string: false }),
          tagList as [Uint8Array, Uint8Array][],
          stringToBuffer(this.data_size),
          this.get("data_root", { decode: true, string: false }),
        ]);
      default:
        throw new Error(`Unexpected transaction format: ${this.format}`);
    }
  }

  
  /**
   * Return an object with the same data as this class.
   * @returns - The transaction as a JSON object.
   */
  public toJSON() {
    return {
      format: this.format,
      id: this.id,
      lastTx: this.lastTx,
      owner: this.owner,
      tags: this.tags,
      target: this.target,
      quantity: this.quantity,
      dataSize: this.dataSize,
      data: bufferTob64Url(this.data),
      dataRoot: this.dataRoot,
      reward: this.reward,
      signature: this.signature
    };
  }
}
