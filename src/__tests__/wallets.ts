import Arsdk from '../arsdk';

const digestRegex = /^[a-z0-9-_]{43}$/i;
const liveAddressBalance = '498557055636';
const liveAddress = '9_666Wkk2GzL0LGd3xhb0jY7HqNy71BaV4sULQlJsBQ';
const liveTxid = 'CE-1SFiXqWUEu0aSTebE6LC0-5JBAc3IAehYGwdF5iI';

jest.setTimeout(10000);

describe('Wallets and keys', () => {
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

  test('Generate valid JWKs', async () => {
    const walletA = await arsdk.wallets.generate();
    const walletB = await arsdk.wallets.generate();

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

    const addressA = await arsdk.wallets.jwkToAddress(walletA);
    const addressB = await arsdk.wallets.jwkToAddress(walletB);

    expect(typeof addressA).toBe('string');
    expect(addressA).toMatch(digestRegex);
    expect(addressB).toMatch(digestRegex);
    expect(addressA).not.toBe(addressB);
  });

  test('Get wallet info', async () => {
    const wallet = await arsdk.wallets.generate();
    const address = await arsdk.wallets.jwkToAddress(wallet);
    const balance = await arsdk.wallets.getBalance(address);
    const lastTx = await arsdk.wallets.getLastTransactionId(address);

    expect(typeof balance).toBe('string');
    expect(balance).toBe('0');
    expect(typeof lastTx).toBe('string');
    expect(lastTx).toBe('');

    const balanceB = await arsdk.wallets.getBalance(liveAddress);
    const lastTxB = await arsdk.wallets.getLastTransactionId(liveAddress);

    expect(typeof balanceB).toBe('string');
    expect(balanceB).toBe(liveAddressBalance);
    expect(typeof lastTxB).toBe('string');
    expect(lastTxB).toBe(liveTxid);
  });

  test('Resolve JWK to Address', async () => {
    const jwk = require('./fixtures/arweave-keyfile.json');
    const address = await arsdk.wallets.jwkToAddress(jwk);

    expect(typeof address).toBe('string');
    expect(address).toBe('fOVzBRTBnyt4VrUUYadBH8yras_-jhgpmNgg-5b3vEw');
  });

  test('Public key to address', async () => {
    const jwk = require('./fixtures/arweave-keyfile.json');
    const address = await arsdk.wallets.ownerToAddress(jwk.n);

    expect(typeof address).toBe('string');
    expect(address).toBe('fOVzBRTBnyt4VrUUYadBH8yras_-jhgpmNgg-5b3vEw');
  });
});
