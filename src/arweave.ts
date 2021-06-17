import ApiConfigInterface from './faces/api';
import Api from './lib/api';

export default class Arweave {
  public api;
  public wallets;
  public transactions;
  public network;
  public ar;
  public silo;
  public chunks;

  public static crypto;
  public static utils;

  constructor(apiConfig: ApiConfigInterface = {}, trustedHosts?: string[]) {
    this.api = new Api(apiConfig, trustedHosts);
  }
}

declare global {
  interface Window {
    Arweave: typeof Arweave;
  }
}
