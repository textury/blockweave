import { NetworkInfoInterface, PeerList } from '../faces/lib/network';
import Api from './api';

export class Network {
  private api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  
  /**
   * Get network info
   * @returns Promise which resolves in the network info object of the current gateway
   */
  public async getInfo(): Promise<NetworkInfoInterface> {
    const res = await this.api.get('info');
    return res.data;
  }

  
  /**
   * Get a list of peers
   * @returns Promise which resolves on an array of peers connected to the current gateway
   */
  public async getPeers(): Promise<PeerList> {
    const res = await this.api.get('peers');
    return res.data;
  }
}
