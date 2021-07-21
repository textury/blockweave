import ApiConfigInterface from './faces/lib/api';
import Api from './lib/api';
import { Network } from './lib/network';

export default class Arweave {
  public api: Api;
  public wallets;
  public transactions;
  public network: Network;
  public ar;
  public silo;
  public chunks;

  public static crypto;
  public static utils;

  constructor(apiConfig: ApiConfigInterface = {}, trustedHosts?: string[]) {
    this.api = new Api(apiConfig, trustedHosts);
    this.network = new Network(this.api);
  }
}

declare global {
  interface Window {
    Arweave: typeof Arweave;
  }
}
