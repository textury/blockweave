import axios from 'axios';
import Arweave from '../../arweave';

jest.setTimeout(30000);

describe('API POST', () => {
  let arweave: Arweave;

  beforeAll(() => {
    arweave = new Arweave({ url: 'https://arweave.net', logging: true });
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

  test('/graphql', async () => {
    const txs = (
      await arweave.api.post('graphql', {
        query: `
      {
        transactions(
          tags: [
            { name: "App-Name", values: ["CommunityXYZ"] }
          ]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      })
    ).data.data.transactions.edges;

    expect(Array.isArray(txs)).toBe(true);
    expect(txs.length).toBeGreaterThan(0);
  });

  test('graphql on invalid gateway, should be replaced to an active one', async () => {
    const inst = new Arweave({ url: 'https://hasdfhahsdflkajsdf.com', logging: true });
    const txs = (
      await inst.api.post('graphql', {
        query: `
      {
        transactions(
          tags: [
            { name: "App-Name", values: ["CommunityXYZ"] }
          ]
        ) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      })
    ).data.data.transactions.edges;

    expect(inst.api.config.host).not.toBe('hasdfhahsdflkajsdf.com');
    expect(Array.isArray(txs)).toBe(true);
    expect(txs.length).toBeGreaterThan(0);
  });

  test("graphql on invalid gateway with invalid trusted hosts, shouldn't be replaced", async () => {
    const inst = new Arweave({ url: 'https://hasdfhahsdflkajsdf.com', logging: true }, ['https://hasdhfhasdf.com']);
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('error'));

    await expect(
      inst.api.post('graphql', {
        query: `
    {
      transactions(
        tags: [
          { name: "App-Name", values: ["CommunityXYZ"] }
        ]
      ) {
        edges {
          node {
            id
          }
        }
      }
    }`,
      }),
    ).rejects.toThrow();
    expect(inst.api.config.host).toBe('hasdfhahsdflkajsdf.com');
  });

  test("graphql on invalid localhost, shouldn't be replaced", async () => {
    const inst = new Arweave({ url: 'https://localhost:9876', logging: true });
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('error'));

    await expect(
      inst.api.post('graphql', {
        query: `
    {
      transactions(
        tags: [
          { name: "App-Name", values: ["CommunityXYZ"] }
        ]
      ) {
        edges {
          node {
            id
          }
        }
      }
    }`,
      }),
    ).rejects.toThrow();
    expect(inst.api.config.host).toBe('localhost');
  });
});
