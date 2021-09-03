import { NetworkInfoInterface, PeerList } from '../faces/lib/network';
import { ArCacheInterface } from '../faces/utils/arCache';
import Api from './api';

export class Network {
  private api: Api;
  private cache: ArCacheInterface;

  constructor(api: Api, cache?: ArCacheInterface) {
    this.api = api;
    this.cache = cache;
  }

  /**
   * Get network info
   * @returns Promise which resolves in the network info object of the current gateway
   */
  public async getInfo(): Promise<NetworkInfoInterface> {
    let data: NetworkInfoInterface = this.cache && (await this.cache.get('network_info'));
    if (!data) {
      const res = await this.api.get('info');
      data = res.data;

      if (this.cache) {
        this.cache.set('network_info', data, 2 * 60 * 1000); // 2 minutes
      }
    }
    return data;
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
