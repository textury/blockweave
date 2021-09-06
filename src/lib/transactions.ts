import { TransactionInterface } from '../faces/lib/transaction';
import { TransactionStatusResponseInterface } from '../faces/lib/transactions';
import { JWKInterface } from '../faces/lib/wallet';
import CryptoInterface, { SignatureOptions } from '../faces/utils/crypto';
import { bufferTob64Url, bufferToString } from '../utils/buffer';
import Chunks from './chunks';
import Transaction from './transaction';
import 'arconnect';
import { SerializedUploader } from '../faces/utils/transactionUploader';
import { TransactionUploader } from '../utils/transactionUploader';
import { ArCacheInterface } from '../faces/utils/arCache';
import Ardk from '../ardk';
import ArCache from '../utils/arCache';

export default class Transactions {
  private solid: Ardk;
  private chunks: Chunks;
  private cache: ArCacheInterface;

  constructor(solid: Ardk, chunks: Chunks, cache: ArCache) {
    this.chunks = chunks;
    this.cache = cache;
    this.solid = solid;
  }

  /**
   * Transactions should use an anchor block to allow submitting of multiple transactions per block.
   * @return {Promise<string>} An anchor block ID.
   */
  public async getTransactionAnchor(): Promise<string> {
    let data: string = this.cache && (await this.cache.get('tx_anchor'));
    if (!data) {
      const res = await this.solid.api.get('tx_anchor');
      data = res.data;

      // A single anchor can work for up to 25 blocks, here we are limiting it to ~20 blocks.
      if (this.cache) {
        this.cache.set('tx_anchor', data, 40 * 60 * 1000);
      }
    }
    return data;
  }

  /**
   * Get the network fee for bytes of data and an optional wallet address.
   * The optional wallet address is required because the first transaction to a wallet has an extra fee to prevent spamming.
   * @param {number} byteSize The number of bytes of data.
   * @param {string} walletAddress The wallet address.
   * @return {Promise<string>} The network fee in Winston.
   */
  public async getPrice(byteSize: number, targetAddress: string = ''): Promise<string> {
    let data: string = this.cache && (await this.cache.get(`getPrice-${byteSize}-${targetAddress}`));

    if (!data) {
      const endpoint = targetAddress ? `price/${byteSize}/${targetAddress}` : `price/${byteSize}`;

      const res = await this.solid.api.get(endpoint, {
        transformResponse: (d): string => d,
      });
      data = res.data;

      if (this.cache) {
        this.cache.set(`getPrice-${byteSize}-${targetAddress}`, data, 10 * 60 * 1000); // 10 minutes
      }
    }

    return data;
  }

  /**
   * Get a Transaction by its ID.
   * @param {string} id The transaction ID.
   * @return {Promise<TransactionInterface>} The transaction.
   * @return {Promise<Transaction>} A promise which resolves into the Transaction object.
   */
  public async get(id: string): Promise<Transaction> {
    const res = await this.solid.api.get(`tx/${id}`);

    switch (res.status) {
      case 200: {
        const dataSize = parseInt(res.data.data_size, 10);
        if (res.data.format >= 2 && dataSize > 0 && dataSize <= 1024 * 1024 * 12) {
          const data = await this.getData(id);
          return new Transaction({ ...res.data, data }, this.solid);
        }

        return new Transaction(
          {
            ...res.data,
            fromat: res.data.format || 1,
          },
          this.solid,
        );
      }
      case 202:
        throw new Error('TX_PENDING');
      case 404:
        throw new Error('TX_NOT_FOUND');
      case 410:
        throw new Error('TX_FAILED');
      default:
        throw new Error('TX_INVALID');
    }
  }

  /**
   * Get a Transaction object, from raw transaction data.
   * @param {Partial<TransactionInterface>} transaction The transaction data.
   * @return {Promise<Transaction>} A promise which resolves into the Transaction object.
   */
  public fromRaw(attributes: Partial<TransactionInterface> = {}): Transaction {
    return new Transaction(attributes, this.solid);
  }

  /**
   * Do a quick search for a tagname and a tag value.
   * @deprecated Use https://npmjs.com/@textury/ardb instead.
   * @returns {Promise<string[]>} An array (up to 10) of strings containing the transaction IDs matching the search.
   */
  public async search(tagName: string, tagValue: string): Promise<string[]> {
    try {
      const res = await this.solid.api.post('graphql', {
        query: `query {
          transactions(first: 10, tags: [
            {name: "${tagName}", values: ["${tagValue}"] }
          ]) {
            edges {
              node {
                id
              }
            }
          }
        }`,
      });

      return res.data.data.transactions.edges.map((e) => e.node.id);
    } catch { }

    return [];
  }

  /**
   * Get the provided transaction ID current status on the network.
   * @param {string} id The transaction ID.
   * @return {Promise<TransactionStatusResponse>} A promise which resolves into the TransactionStatusResponse object.
   */
  public async getStatus(id: string): Promise<TransactionStatusResponseInterface> {
    const res = await this.solid.api.get(`tx/${id}/status`);
    if (res.status === 200) {
      return {
        status: 200,
        confirmed: res.data,
      };
    }

    return {
      status: res.status,
      confirmed: null,
    };
  }

  /**
   * Get the transaction data for a transaction ID.
   * @param {string} id The transaction ID.
   * @param {{decode: boolean; string: boolean;}} options Options for the data, optional.
   * @return {Promise<string>} The transaction data.
   * @return {Promise<Uint8Array>} The transaction data as an Uint8Array.
   */
  public async getData(id: string, options?: { decode?: boolean; string?: boolean }): Promise<string | Uint8Array> {
    const res = await this.solid.api.get(id, { responseType: 'arraybuffer' });
    let data: Uint8Array;
    if (res.status === 200) {
      data = new Uint8Array(res.data);
    }

    if (res.status === 400 && (res.data === 'tx_data_too_big' || res.statusText === 'tx_data_too_big')) {
      data = await this.chunks.downloadchunkedData(id);
    }

    if (!data) {
      switch (res.status) {
        case 202:
          throw new Error('TX_PENDING');
        case 404:
          throw new Error('TX_NOT_FOUND');
        case 410:
          throw new Error('TX_FAILED');
        default:
          throw new Error(`Unable to get data: ${res.status} - ${res.data || res.statusText}`);
      }
    }

    if (options && options.decode && !options.string) {
      return data;
    } else if (options && options.decode && options.string) {
      return bufferToString(data);
    }

    return bufferTob64Url(data);
  }

  /**
   * Sign a transaction with your wallet, to be able to post it to Ardk.
   * @param {Transaction} transaction The transaction to sign.
   * @param {JWKInterface} jwk A JWK (Wallet address JSON representation) to sign the transaction with. Or 'use_wallet' to use the wallet from an external tool.
   * @param {SignatureOptions} options Signature options, optional.
   * @return {Promise<void>}
   */
  public async sign(
    transaction: Transaction,
    jwk?: JWKInterface | 'use_wallet',
    options?: SignatureOptions,
  ): Promise<void> {
    return transaction.sign(jwk, options);
  }

  /**
   * Post a previously signed transaction to the network.
   * @param  {Transaction|Buffer|string|object} transaction - The transaction to post.
   * @returns {Promise} Returns a promise which resolves to `{status: number; statusText: string; data: any}`.
   */
  public async post(
    transaction: Transaction | Buffer | string | object,
  ): Promise<{ status: number; statusText: string; data: any }> {
    if (typeof transaction === 'string') {
      transaction = new Transaction(JSON.parse(transaction), this.solid);
    } else if (typeof (transaction as any).readInt32BE === 'function') {
      transaction = new Transaction(JSON.parse(transaction.toString()), this.solid);
    } else if (typeof transaction === 'object' && !(transaction instanceof Transaction)) {
      transaction = new Transaction(transaction as object, this.solid);
    }

    if (!(transaction instanceof Transaction)) {
      throw new Error('Transaction must be an instance of Transaction');
    }

    return transaction.post();
  }

  /**
   * Gets an uploader than can be used to upload a transaction chunk by chunk, giving progress
   * @param upload a Transaction object, a previously save progress object, or a transaction id.
   * @param data the data of the transaction. Required when resuming an upload.
   */
  public async getUploader(upload: Transaction | SerializedUploader | string, data?: Uint8Array | ArrayBuffer) {
    const txUploader = new TransactionUploader(this.solid, upload, Ardk.crypto);
    return txUploader.getUploader(upload, data);
  }

  /**
   * Async generator version of uploader
   * @param {Transaction} upload a Transaction object, a previously save uploader, or a transaction id.
   * @param {Uint8Array} data the data of the transaction. Required when resuming an upload.
   */
  public async *upload(upload: Transaction, data?: Uint8Array) {
    const txUploader = new TransactionUploader(this.solid, upload, Ardk.crypto);
    return txUploader.upload(upload, data);
  }
}
