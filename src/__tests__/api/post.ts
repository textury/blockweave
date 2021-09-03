import axios from 'axios';
import Arsdk from '../../arsdk';

jest.setTimeout(30000);

describe('API POST', () => {
  let arsdk: Arsdk;

  beforeAll(() => {
    arsdk = new Arsdk({ url: 'https://arweave.net' });
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
      await arsdk.api.post('graphql', {
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
    const inst = new Arsdk({ url: 'https://hasdfhahsdflkajsdf.com' });
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
    const inst = new Arsdk({ url: 'https://hasdfhahsdflkajsdf.com' }, ['https://hasdhfhasdf.com']);
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
    const inst = new Arsdk({ url: 'https://localhost:9876' });
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
