import ApiConfigInterface from './faces/lib/api';
import CryptoInterface from './faces/utils/crypto';
import Api from './lib/api';
import { Network } from './lib/network';
import Wallets from './lib/wallets';
import CryptoDriver from './utils/crypto';
import Ar from './utils/ar';
import Chunks from './lib/chunks';
import Transactions from './lib/transactions';
import ArCache from './utils/arCache';
import { JWKInterface } from './faces/lib/wallet';
import { CreateTransactionInterface } from './faces/arpi';
import Transaction from './lib/transaction';
import * as SmartWeaveSdk from 'redstone-smartweave';
import * as arpiUtils from './utils/buffer';
import Logging from './utils/logging';
import Blocks from './lib/blocks';

export default class Arpi {
  public api: Api;
  public wallets: Wallets;
  public transactions: Transactions;
  public blocks: Blocks;
  public network: Network;
  public ar: Ar;
  public chunks: Chunks;
  public cache: ArCache;
  public utils = arpiUtils;
  /**
   * @deprecated Use the static Arpi.crypto instead.
   */
  public crypto: CryptoInterface = new CryptoDriver();

  public static smartWeave = SmartWeaveSdk;
  public static crypto: CryptoInterface = new CryptoDriver();

  constructor(apiConfig: ApiConfigInterface = {}, trustedHosts?: string[]) {
    this.cache = new ArCache();

    if (apiConfig.logging && !apiConfig.logger) {
      apiConfig.logger = new Logging(apiConfig);
    }

    this.api = new Api(apiConfig, trustedHosts);
    this.network = new Network(this.api, this.cache);
    this.wallets = new Wallets(this.api, Arpi.crypto, this.cache);
    this.ar = new Ar();
    this.chunks = new Chunks(this.api);
    this.transactions = new Transactions(this, this.chunks, this.cache);
    this.blocks = new Blocks(this.api, this.network, this.cache);
  }

  public async createTransaction(
    attributes: Partial<CreateTransactionInterface>,
    jwk?: JWKInterface | 'use_wallet',
  ): Promise<Transaction> {
    return Transaction.create(this, attributes, jwk);
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
    Arpi: typeof Arpi;
  }
}
