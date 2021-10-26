import Blockweave from '../blockweave';

const digestRegex = /^[a-z0-9-_]{43}$/i;
const liveAddressBalance = '498557055636';
const liveAddress = '9_666Wkk2GzL0LGd3xhb0jY7HqNy71BaV4sULQlJsBQ';
const liveTxid = 'CE-1SFiXqWUEu0aSTebE6LC0-5JBAc3IAehYGwdF5iI';

jest.setTimeout(10000);

describe('Wallets and keys', () => {
  let blockweave: Blockweave;

  beforeAll(() => {
    blockweave = new Blockweave({ url: 'https://arweave.net' });
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

  test('Generate valid JWKs', async () => {
    const walletA = await blockweave.wallets.generate();
    const walletB = await blockweave.wallets.generate();

    expect(typeof walletA).toBe('object');
    expect(walletA.kty).toBe('RSA');
    expect(walletA.e).toBe('AQAB');
    expect(walletA.n).toMatch(/^[a-z0-9-_]{683}$/i);
    expect(walletA.d).toMatch(/^[a-z0-9-_]{683}$/i);
    expect(walletA.p).toBeDefined();
    expect(walletA.q).toBeDefined();
    expect(walletA.dp).toBeDefined();
    expect(walletA.dq).toBeDefined();
    expect(walletA.qi).toBeDefined();

    const addressA = await blockweave.wallets.jwkToAddress(walletA);
    const addressB = await blockweave.wallets.jwkToAddress(walletB);

    expect(typeof addressA).toBe('string');
    expect(addressA).toMatch(digestRegex);
    expect(addressB).toMatch(digestRegex);
    expect(addressA).not.toBe(addressB);
  });

  test('Get wallet info', async () => {
    const wallet = await blockweave.wallets.generate();
    const address = await blockweave.wallets.jwkToAddress(wallet);
    const balance = await blockweave.wallets.getBalance(address);
    const lastTx = await blockweave.wallets.getLastTransactionId(address);

    expect(typeof balance).toBe('string');
    expect(balance).toBe('0');
    expect(typeof lastTx).toBe('string');
    expect(lastTx).toBe('');

    const balanceB = await blockweave.wallets.getBalance(liveAddress);
    const lastTxB = await blockweave.wallets.getLastTransactionId(liveAddress);

    expect(typeof balanceB).toBe('string');
    expect(balanceB).toBe(liveAddressBalance);
    expect(typeof lastTxB).toBe('string');
    expect(lastTxB).toBe(liveTxid);
  });

  test('Resolve JWK to Address', async () => {
    const jwk = require('./fixtures/arweave-keyfile.json');
    const address = await blockweave.wallets.jwkToAddress(jwk);

    expect(typeof address).toBe('string');
    expect(address).toBe('fOVzBRTBnyt4VrUUYadBH8yras_-jhgpmNgg-5b3vEw');
  });

  test('Public key to address', async () => {
    const jwk = require('./fixtures/arweave-keyfile.json');
    const address = await blockweave.wallets.ownerToAddress(jwk.n);

    expect(typeof address).toBe('string');
    expect(address).toBe('fOVzBRTBnyt4VrUUYadBH8yras_-jhgpmNgg-5b3vEw');
  });
});
