import { NetworkInfoInterface, PeerList } from '../faces/lib/network';
import Api from './api';

export class Network {
  private api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  public async getInfo(): Promise<NetworkInfoInterface> {
    const res = await this.api.get('info');
    return res.data;
  }

  public async getPeers(): Promise<PeerList> {
    const res = await this.api.get('peers');
    return res.data;
  }
}
