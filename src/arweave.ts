import ApiConfigInterface from './faces/lib/api';
import CryptoInterface from './faces/utils/crypto';
import Api from './lib/api';
import { Network } from './lib/network';
import Wallets from './lib/wallets';
import CryptoDriver from './utils/crypto';
import * as utils from './utils/buffer';
import Ar from './utils/ar';
import Chunks from './lib/chunks';
import Transactions from './lib/transactions';
import ArCache from './utils/arCache';
import { JWKInterface } from './faces/lib/wallet';
import { CreateTransactionInterface } from './faces/arweave';
import Transaction from './lib/transaction';
import { TransactionInterface } from './faces/lib/transaction';
import Logging from './utils/logging';

export default class Arweave {
  public api: Api;
  public wallets: Wallets;
  public transactions: Transactions;
  public network: Network;
  public ar: Ar;
  public silo;
  public chunks: Chunks;

  public static crypto: CryptoInterface = new CryptoDriver();
  public static utils = utils;

  constructor(apiConfig: ApiConfigInterface = {}, trustedHosts?: string[]) {
    const cache = new ArCache();

    if (apiConfig.logging && !apiConfig.logger) {
      apiConfig.logger = new Logging(apiConfig);
    }

    this.api = new Api(apiConfig, trustedHosts);
    this.network = new Network(this.api);
    this.wallets = new Wallets(this.api, Arweave.crypto, cache);
    this.ar = new Ar();
    this.chunks = new Chunks(this.api);
    this.transactions = new Transactions(this.api, Arweave.crypto, this.chunks, cache);
  }

  public async createTransaction(
    attributes: Partial<CreateTransactionInterface>,
    jwk?: JWKInterface | 'use_wallet',
  ): Promise<Transaction> {
    const transaction: Partial<CreateTransactionInterface> = {};
    Object.assign(transaction, attributes);

    if (!attributes.data && !attributes.target && !attributes.quantity) {
      throw new Error('A new Arweave transaction must have a `data`, or `target` and `quantity`.');
    }

    if (!attributes.owner) {
      if (jwk && jwk !== 'use_wallet') {
        transaction.owner = jwk.n;
      }
    }
    if (attributes.last_tx === undefined) {
      transaction.last_tx = await this.transactions.getTransactionAnchor();
    }

    if (typeof attributes.data === 'string') {
      attributes.data = utils.stringToBuffer(attributes.data);
    }

    if (attributes.data instanceof ArrayBuffer || attributes.data instanceof Buffer) {
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
      transaction.reward = await this.transactions.getPrice(length, transaction.target);
    }

    // here we should call prepare chunk
    transaction.data_root = '';
    transaction.data_size = attributes.data ? attributes.data.byteLength.toString() : '0';
    transaction.data = attributes.data || new Uint8Array(0);

    const createdTransaction = new Transaction(transaction as TransactionInterface);
    await createdTransaction.getSignatureData();
    return createdTransaction;
  }

  /**
   * Do an ArQL request.
   * @deprecated Use https://npmjs.org/@textury/ardb instead.
   * @param  {object} query
   * @returns Promise
   */
  public async arql(query: object): Promise<string[]> {
    const res = await this.api.post('/arql', query);
    return res.data || [];
  }
}

declare global {
  interface Window {
    Arweave: typeof Arweave;
  }
}
