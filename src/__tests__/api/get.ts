import axios from 'axios';
import Ardk from '../../ardk';

describe('API GET', () => {
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

  test('/info', async () => {
    const res = await ardk.api.get('/info');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      network: expect.any(String),
      version: expect.any(Number),
      release: expect.any(Number),
      height: expect.any(Number),
      current: expect.any(String),
      blocks: expect.any(Number),
      peers: expect.any(Number),
      queue_length: expect.any(Number),
      node_state_latency: expect.any(Number),
    });
  });

  test('info', async () => {
    const res = await ardk.api.get('info');

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      network: expect.any(String),
      version: expect.any(Number),
      release: expect.any(Number),
      height: expect.any(Number),
      current: expect.any(String),
      blocks: expect.any(Number),
      peers: expect.any(Number),
      queue_length: expect.any(Number),
      node_state_latency: expect.any(Number),
    });
  });

  test('info on invalid gateway, should be replaced to an active one', async () => {
    const inst = new Ardk({ url: 'https://hasdfhahsdflkajsdf.com' });
    const res = await inst.api.get('info');

    expect(inst.api.config.host).not.toBe('hasdfhahsdflkajsdf.com');
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      network: expect.any(String),
      version: expect.any(Number),
      release: expect.any(Number),
      height: expect.any(Number),
      current: expect.any(String),
      blocks: expect.any(Number),
      peers: expect.any(Number),
      queue_length: expect.any(Number),
      node_state_latency: expect.any(Number),
    });
  });

  test("info on invalid gateway with invalid trusted hosts, shouldn't be replaced", async () => {
    const inst = new Ardk({ url: 'https://hasdfhahsdflkajsdf.com' }, ['https://hasdhfhasdf.com']);
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('error'));

    await expect(inst.api.get('info')).rejects.toThrow();
    expect(inst.api.config.host).toBe('hasdfhahsdflkajsdf.com');
  });

  test("info on invalid localhost, shouldn't be replaced", async () => {
    const inst = new Ardk({ url: 'https://localhost:9876' });
    jest.spyOn(axios, 'get').mockRejectedValue(new Error('error'));

    await expect(inst.api.get('info')).rejects.toThrow();
    expect(inst.api.config.host).toBe('localhost');
  });
});
