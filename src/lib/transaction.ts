import { TagInterface } from '../faces/lib/tag';
import { TransactionInterface } from '../faces/lib/transaction';
import { BaseObject } from '../utils/baseObject';
import { b64UrlToBuffer, bufferTob64Url, concatBuffers, stringToB64Url, stringToBuffer } from '../utils/buffer';
import { Tag } from './tag';
import Merkle from '../utils/merkle';
import deepHash from '../utils/deepHash';
import CryptoInterface, { SignatureOptions } from '../faces/utils/crypto';
import { JWKInterface } from '../faces/lib/wallet';
import { TransactionUploader } from '../utils/transactionUploader';
import Api from './api';
import selectWeightedHolder from '../utils/fee';
import Blockweave from '../blockweave';
import { CreateTransactionInterface } from '../faces/blockweave';

export default class Transaction extends BaseObject implements TransactionInterface {
  public readonly format: number = 2;
  public id: string = '';
  // tslint:disable-next-line: variable-name
  public readonly last_tx: string = '';
  public owner: string = '';
  public tags: TagInterface[] = [];
  public readonly target: string = '';
  public readonly quantity: string = '0';
  // tslint:disable-next-line: variable-name
  public readonly data_size: string = '0';
  public data: Uint8Array = new Uint8Array();
  // tslint:disable-next-line: variable-name
  public data_root: string = '';
  public reward: string = '0';
  public signature: string = '';

  public chunks;
  private blockweave: Blockweave;
  private api: Api;

  private merkle: Merkle;
  private jwk: JWKInterface | 'use_wallet';

  // private _raw: TransactionInterface = {};

  constructor(
    attributes: Partial<TransactionInterface> = {},
    blockweave: Blockweave,
    jwk: JWKInterface | 'use_wallet' = 'use_wallet',
  ) {
    super();

    Object.assign(this, attributes);

    // If something passes in a Tx that has been toJSON'ed and back,
    // or where the data was filled in from /tx/data endpoint.
    // data will be b64url encoded, so decode it.
    if (typeof this.data === 'string') {
      this.data = b64UrlToBuffer(this.data);
    }

    if (attributes.tags) {
      this.tags = attributes.tags.map((tag) => new Tag(tag.name, tag.value));
    }

    this.blockweave = blockweave;
    this.jwk = jwk;
    this.merkle = new Merkle();
  }

  static async create(
    blockweave: Blockweave,
    attributes: Partial<CreateTransactionInterface>,
    jwk: JWKInterface | 'use_wallet',
  ) {
    const transaction: Partial<CreateTransactionInterface> = {};
    Object.assign(transaction, attributes);

    if (!attributes.data && !(attributes.target && attributes.quantity)) {
      throw new Error('A new Blockweave transaction must have a `data`, or `target` and `quantity`.');
    }

    if (!attributes.owner) {
      if (jwk && jwk !== 'use_wallet') {
        transaction.owner = jwk.n;
      }
    }
    if (attributes.last_tx === undefined) {
      transaction.last_tx = await blockweave.transactions.getTransactionAnchor();
    }

    if (typeof attributes.data === 'string') {
      attributes.data = stringToBuffer(attributes.data);
    }

    if (
      attributes.data &&
      (attributes.data.constructor.name === 'ArrayBuffer' || attributes.data.constructor.name === 'Buffer')
    ) {
      attributes.data = new Uint8Array(attributes.data);
    }

    // Replaced instanceof with getting the constructor.name, if not, jest on jsdom will fail.
    if (attributes.data && attributes.data.constructor.name !== 'Uint8Array') {
      throw new Error(
        `Expected data to be a string, Uint8Array or ArrayBuffer. ${attributes.data.constructor.name} received.`,
      );
    }

    if (attributes.reward === undefined) {
      const length = attributes.data ? attributes.data.byteLength : 0;
      transaction.reward = await blockweave.transactions.getPrice(length, transaction.target);
    }

    // here we should call prepare chunk
    transaction.data_root = '';
    transaction.data_size = attributes.data ? attributes.data.byteLength.toString() : '0';
    transaction.data = attributes.data || new Uint8Array(0);

    const createdTransaction = new Transaction(transaction as TransactionInterface, blockweave, jwk);
    await createdTransaction.getSignatureData();
    return createdTransaction;
  }

  /**
   * Add a new tag to this transaction.
   * @param  {string} name
   * @param  {string} value
   */
  public addTag(name: string, value: string) {
    this.tags.push(new Tag(stringToB64Url(name), stringToB64Url(value)));
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
  public setSignature({ id, owner, tags, signature }: Partial<TransactionInterface>) {
    this.id = id;
    this.owner = owner;
    if (tags) {
      this.tags = tags;
    }
    this.signature = signature;
  }
  /**
   * Prepare the data as chunks.
   * @param  {Uint8Array} data
   */
  public async prepareChunks(data: Uint8Array) {
    if (!this.chunks && data.byteLength > 0) {
      this.chunks = await this.merkle.generateTransactionChunks(data);
      this.data_root = bufferTob64Url(this.chunks.data_root);
    }

    if (!this.chunks && data.byteLength === 0) {
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
  public getChunk(
    idx: number,
    data: Uint8Array,
  ): {
    data_root: any;
    data_size: any;
    data_path: string;
    offset: any;
    chunk: string;
  } {
    if (!this.chunks) {
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
            tag.get('name', { decode: true, string: false }),
            tag.get('value', { decode: true, string: false }),
          ]);
        }, new Uint8Array());

        return concatBuffers([
          this.get('owner', { decode: true, string: false }),
          this.get('target', { decode: true, string: false }),
          this.get('data', { decode: true, string: false }),
          stringToBuffer(this.quantity),
          stringToBuffer(this.reward),
          this.get('last_tx', { decode: true, string: false }),
          tags,
        ]);
      case 2:
        await this.prepareChunks(this.data);

        const tagList: [Uint8Array, Uint8Array][] = this.tags.map((tag) => [
          tag.get('name', { decode: true, string: false }),
          tag.get('value', { decode: true, string: false }),
        ]) as [Uint8Array, Uint8Array][];

        const toHash = [
          stringToBuffer(this.format.toString()),
          this.get('owner', { decode: true, string: false }),
          this.get('target', { decode: true, string: false }),
          stringToBuffer(this.quantity),
          stringToBuffer(this.reward),
          this.get('last_tx', { decode: true, string: false }),
          tagList,
          stringToBuffer(this.data_size),
          this.get('data_root', { decode: true, string: false }),
        ];

        return await deepHash(toHash);
      default:
        throw new Error(`Unexpected transaction format: ${this.format}`);
    }
  }

  /**
   * Verify a signed transaction.
   * @param  {Transaction} transaction
   * @returns {Promise<boolean>} A boolean value indicating whether the transaction is valid.
   */
  public async verify(): Promise<boolean> {
    const signaturePayload = await this.getSignatureData();

    /**
     * The transaction ID should be a SHA-256 hash of the raw signature bytes, so this needs
     * to be recalculated from the signature and checked against the transaction ID.
     */
    const rawSignature = this.get('signature', {
      decode: true,
      string: false,
    });

    const expectedId = bufferTob64Url(await Blockweave.crypto.hash(rawSignature));

    if (this.id !== expectedId) {
      throw new Error(
        `Invalid transaction signature or ID! The transaction ID doesn't match the expected SHA-256 hash of the signature.`,
      );
    }

    /**
     * Now verify the signature is valid and signed by the owner wallet (owner field = originating wallet public key).
     */
    return Blockweave.crypto.verify(this.owner, signaturePayload, rawSignature);
  }

  /**
   * Sign a transaction with your wallet, to be able to post it to Blockweave.
   * @param {JWKInterface} jwk A JWK (Wallet address JSON representation) to sign the transaction with. Or 'use_wallet' to use the wallet from an external tool.
   * @param {SignatureOptions} options Signature options, optional.
   * @return {Promise<void>}
   */
  public async sign(jwk?: JWKInterface | 'use_wallet', options?: SignatureOptions): Promise<void> {
    if (!jwk && this.jwk) {
      jwk = this.jwk;
    }

    if (!jwk && (typeof window === 'undefined' || !window.arweaveWallet)) {
      throw new Error('An arweave JWK must be provided.');
    } else if (!jwk || jwk === 'use_wallet') {
      try {
        const existingPermissions = await window.arweaveWallet.getPermissions();
        if (!existingPermissions.includes('SIGN_TRANSACTION')) {
          await window.arweaveWallet.connect(['SIGN_TRANSACTION']);
        }
      } catch {
        throw new Error('Unable to connect to wallet.');
      }

      try {
        const transaction = {
          format: this.format,
          id: this.id,
          last_tx: this.last_tx,
          owner: this.owner,
          tags: this.tags,
          target: this.target,
          quantity: this.quantity,
          data_size: this.data_size,
          data: this.data,
          data_root: this.data_root,
          reward: this.reward,
          signature: this.signature,
          chunks: this.chunks,
        };

        const signedTransaction = await window.arweaveWallet.sign(transaction as any, options);
        this.setSignature({
          id: signedTransaction.id,
          owner: signedTransaction.owner,
          tags: signedTransaction.tags,
          signature: signedTransaction.signature,
        });
      } catch {
        throw new Error('Unable to sign transaction');
      }
    } else {
      this.setOwner(jwk.n);

      const dataToSign = await this.getSignatureData();
      const rawSignature = await Blockweave.crypto.sign(jwk, dataToSign, options);
      const id = await Blockweave.crypto.hash(rawSignature);

      this.setSignature({
        id: bufferTob64Url(id),
        owner: jwk.n,
        signature: bufferTob64Url(rawSignature),
      });
    }
  }

  /**
   * Post a previously signed transaction to the network.
   * @param {number} feePercent The transaction fee %, in AR.
   * @returns {Promise} Returns a promise which resolves to `{status: number; statusText: string; data: any}`.
   */
  public async post(feePercent: number = 0.1): Promise<{ status: number; statusText: string; data: any }> {
    const txUploader = new TransactionUploader(this.blockweave, this, Blockweave.crypto);
    const uploader = await txUploader.getUploader(this);

    // Emulate existing error & return value behaviour.
    try {
      while (!uploader.isComplete) {
        await uploader.uploadChunk();
      }
    } catch (e) {
      if (uploader.lastResponseStatus > 0) {
        return {
          status: uploader.lastResponseStatus,
          statusText: uploader.lastResponseError,
          data: {
            error: uploader.lastResponseError,
          },
        };
      }
      throw e;
    }

    if (feePercent) {
      this.chargeFee(feePercent);
    }

    return {
      status: 200,
      statusText: 'OK',
      data: {},
    };
  }

  /**
   * @param  {JWKInterface|'use_wallet'} jwk?
   * @param  {SignatureOptions} options?
   * @param  {number} feePercent?
   * @returns {Promise<{ status: number; statusText: string; data: any }>} Returns the response `status, statusText, data}.
   */
  public async signAndPost(
    jwk?: JWKInterface | 'use_wallet',
    options?: SignatureOptions,
    feePercent?: number,
  ): Promise<{ status: number; statusText: string; data: any }> {
    await this.sign(jwk, options);
    return this.post(feePercent);
  }

  /**
   * Return an object with the same data as this class.
   * @returns - The transaction as a JSON object.
   */
  public toJSON() {
    return {
      format: this.format,
      id: this.id,
      last_tx: this.last_tx,
      owner: this.owner,
      tags: this.tags,
      target: this.target,
      quantity: this.quantity,
      data_size: this.data_size,
      data: bufferTob64Url(this.data),
      data_root: this.data_root,
      reward: this.reward,
      signature: this.signature,
    };
  }
  /**
   * @param  {number=0.1} feePercent
   */
  private async chargeFee(feePercent: number = 0.1) {
    if (!feePercent) {
      return;
    }

    if (feePercent > 1) {
      throw new Error('Fee percent must be between 0 and 1. Ex: 0.1 = 10%');
    }

    const fee = +this.reward * feePercent;
    const target = await selectWeightedHolder(this.blockweave);

    if (!target || target === (await this.blockweave.wallets.jwkToAddress(this.jwk))) {
      return;
    }

    const tx = await Transaction.create(
      this.blockweave,
      {
        target,
        quantity: fee.toString(),
      },
      this.jwk,
    );

    tx.addTag('App-Name', 'Blockweave');
    tx.addTag('Service', 'Blockweave');
    tx.addTag('Action', 'post');
    tx.addTag('Message', `Deployed ${this.id}`);
    tx.addTag('Size', this.data_size);

    await tx.signAndPost(this.jwk, null, 0);
  }
}
