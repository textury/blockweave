import Ardk from '../ardk';
import { NetworkInfoInterface, PeerList } from '../faces/lib/network';

describe('NETWORK', () => {
  let ardk: Ardk;

  beforeAll(() => {
    ardk = new Ardk({ url: 'https://arweave.net' });
  });

  beforeEach(() => {
    jest.spyOn(console, 'error');
    // @ts-ignore jest.spyOn adds this functionallity
    console.error.mockImplementation(() => null);
  });

  afterEach(() => {
    // @ts-ignore jest.spyOn adds this functionallity
    console.error.mockRestore();
  });

  test('getInfo', async () => {
    const info: NetworkInfoInterface = await ardk.network.getInfo();

    expect(info).toBeInstanceOf(Object);
    expect(typeof info.network).toBe('string');
    expect(typeof info.version).toBe('number');
    expect(typeof info.release).toBe('number');
    expect(typeof info.height).toBe('number');
    expect(typeof info.current).toBe('string');
    expect(typeof info.blocks).toBe('number');
    expect(typeof info.peers).toBe('number');
    expect(typeof info.queue_length).toBe('number');
    expect(typeof info.node_state_latency).toBe('number');
  });

  test('getPeers', async () => {
    const peers: PeerList = await ardk.network.getPeers();

    expect(peers.length).toBeGreaterThan(0);
    expect(typeof peers[0]).toBe('string');
  });
});
