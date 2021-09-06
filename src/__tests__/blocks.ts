import Ardk from '../ardk';

jest.setTimeout(10000);

describe('Blocks', () => {
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

  test("Get block's data by its indep_hash", async () => {
    // given
    // https://arweave.net/block/hash/zbUPQFA4ybnd8h99KI9Iqh4mogXJibr0syEwuJPrFHhOhld7XBMOUDeXfsIGvYDp
    const blockIndepHash = 'zbUPQFA4ybnd8h99KI9Iqh4mogXJibr0syEwuJPrFHhOhld7XBMOUDeXfsIGvYDp';
    const expectedResult = require(`./fixtures/block_${blockIndepHash}.json`);

    // when
    const result = (await ardk.blocks.get(blockIndepHash)) as any; // note: any to be able to access object values by keys.

    // then
    expect(expectedResult).toStrictEqual(result);
  });

  test("Get current block's data", async () => {
    // given
    const { current } = await ardk.network.getInfo();

    // when
    const result = await ardk.blocks.getCurrent();

    // then
    expect(result.indep_hash).toBe(current);
  });
});

async function pause(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
