import ApiConfigInterface from './faces/lib/api';
import CryptoInterface from './faces/utils/crypto';
import Api from './lib/api';
import { Network } from './lib/network';
import Wallets from './lib/wallets';
import CryptoDriver from './utils/crypto';

export default class Arweave {
  public api: Api;
  public wallets: Wallets;
  public transactions;
  public network: Network;
  public ar;
  public silo;
  public chunks;

  public static crypto: CryptoInterface = new CryptoDriver();
  public static utils;

  constructor(apiConfig: ApiConfigInterface = {}, trustedHosts?: string[]) {
    this.api = new Api(apiConfig, trustedHosts);
    this.network = new Network(this.api);
    this.wallets = new Wallets(this.api, Arweave.crypto);
  }
}

declare global {
  interface Window {
    Arweave: typeof Arweave;
  }
}
