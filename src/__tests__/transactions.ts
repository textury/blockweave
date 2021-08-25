import { randomBytes } from 'crypto';
import Arweave from '../arweave';
import transaction from '../lib/transaction';
import Transaction from '../lib/transaction';
import { b64UrlToBuffer, bufferTob64Url } from '../utils/buffer';

const digestRegex = /^[a-z0-9-_]{43}$/i;
const liveDataTxid = 'bNbA3TEQVL60xlgCcqdz4ZPHFZ711cZ3hmkpGttDt_U';

// These are all identical data (test.mp4)
// const liveDataTxidLarge = "8S0uH6EtRkJOG0b0Q2XsEBSZmbMLnxAwIlNAe_P7ZHg";
// const liveDataTxidLarge = "P4l6aCN97rt4GoyrpG1oKq3A20B2Y24GqmMLWNZlNIk"
const liveDataTxidLarge = 'KDKSOaecDl_IM4E0_0XiApwdrElvb9TnwOzeHt65Sno';

describe('Transactions', () => {
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

  test('getTransactionAnchor', async () => {
    const txAnchor = await arweave.transactions.getTransactionAnchor();
    expect(txAnchor).toBeDefined();

    await pause();
    const txAnchor2 = await arweave.transactions.getTransactionAnchor();
    expect(txAnchor2).toBeDefined();
    expect(txAnchor).toEqual(txAnchor2);
  });

  test('Create and sign data transactions', async () => {
    const wallet = await arweave.wallets.generate();

    const transaction: Transaction = await arweave.createTransaction({ data: 'test' }, wallet);
    transaction.addTag('test-tag-1', 'test-value-1');
    transaction.addTag('test-tag-2', 'test-value-2');
    transaction.addTag('test-tag-3', 'test-value-3');

    expect(transaction).toBeInstanceOf(Transaction);
    expect(transaction.get('data')).toBe('dGVzdA');
    expect(transaction.last_tx).toMatch(/^[a-z0-9-_]{64}$/i);
    expect(transaction.reward).toMatch(/^[0-9]+$/);

    await arweave.transactions.sign(transaction, wallet);
    expect(transaction.signature).toMatch(/^[a-z0-9-_]+$/i);
    expect(transaction.id).toMatch(digestRegex);

    const verified = await arweave.transactions.verify(transaction);
    expect(typeof verified).toBe('boolean');
    expect(verified).toBeTruthy();

    // Needs ts-ignoring as tags are readonly so chaning the tag like this isn't
    // normally an allowed operation, but it's a test, so...
    transaction.tags[1].value = 'dGVzdDI';

    const verifiedWithModififedTags = await arweave.transactions.verify(transaction);

    expect(typeof verifiedWithModififedTags).toBe('boolean');

    expect(verifiedWithModififedTags).toBeFalsy();
  });

  test('Use JWK.n as transaction owner', async () => {
    const wallet = await arweave.wallets.generate();

    const transaction = await arweave.createTransaction({ data: 'test' }, wallet);
    expect(transaction.get('owner')).toBe(wallet.n);
  });

  test('Use the provided transaction owner attribute', async () => {
    const transaction = await arweave.createTransaction({
      data: 'test',
      owner: 'owner-test-abc',
    });

    expect(transaction.get('owner')).toBe('owner-test-abc');
  });

  test('Create and sign valid transactions when no owner or JWK provided', async () => {
    const wallet = await arweave.wallets.generate();

    const transaction = await arweave.createTransaction({ data: 'test' });
    await arweave.transactions.sign(transaction, wallet);
    expect(transaction.get('owner')).toBe(wallet.n);

    const verified = await arweave.transactions.verify(transaction);
    expect(verified).toBeTruthy();
    expect(typeof verified).toBe('boolean');
  });

  test('Create and sign ar transactions', async () => {
    const wallet = await arweave.wallets.generate();

    const transaction = await arweave.createTransaction(
      {
        target: 'GRQ7swQO1AMyFgnuAPI7AvGQlW3lzuQuwlJbIpWV7xk',
        quantity: arweave.ar.arToWinston('1.5'),
      },
      wallet,
    );

    expect(transaction).toBeInstanceOf(Transaction);
    expect(typeof transaction.quantity).toBe('string');
    expect(transaction.quantity).toBe('1500000000000');
    expect(typeof transaction.target).toBe('string');
    expect(transaction.target).toBe('GRQ7swQO1AMyFgnuAPI7AvGQlW3lzuQuwlJbIpWV7xk');
  });

  test('Using buffers', async () => {
    const wallet = await arweave.wallets.generate();

    const data = randomBytes(100);
    const tx = await arweave.createTransaction({ data }, wallet);

    tx.addTag('test-tag-1', 'test-value-1');
    tx.addTag('test-tag-2', 'test-value-2');
    tx.addTag('test-tag-3', 'test-value-3');

    expect(tx).toBeInstanceOf(Transaction);

    expect(Buffer.from(tx.get('data', { decode: true, string: false }))).toStrictEqual(data);

    expect(tx.last_tx).toMatch(/^[a-z0-9-_]{64}$/i);
    expect(tx.reward).toMatch(/^[0-9]+$/);

    await arweave.transactions.sign(tx, wallet);
    expect(tx.signature).toMatch(/^[a-z0-9-_]+$/i);
    expect(tx.id).toMatch(digestRegex);

    const verified = await arweave.transactions.verify(tx);
    expect(typeof verified).toBe('boolean');
    expect(verified).toBeTruthy();

    // Only for testing purposes. Do not change the tags like this.
    tx.tags[1].value = 'dGVzdDI';
    const verifiedWithModififedTags = await arweave.transactions.verify(tx);
    expect(typeof verifiedWithModififedTags).toBe('boolean');
    expect(verifiedWithModififedTags).toBeFalsy();
  }, 10000);

  test('Get transaction info', async () => {
    const transactionStatus = await arweave.transactions.getStatus(liveDataTxid);
    const tx = await arweave.transactions.get('g2c8fv2SN1iPZjhWSUbSTUhOLtT2yB-wSf3jvH89Dy4');

    expect(typeof transactionStatus).toBe('object');
    expect(typeof transactionStatus.confirmed).toBe('object');

    expect(Object.keys(transactionStatus.confirmed!)).toEqual([
      'block_height',
      'block_indep_hash',
      'number_of_confirmations',
    ]);

    expect(typeof transactionStatus.confirmed!.block_indep_hash).toBe('string');
    expect(typeof transactionStatus.confirmed!.block_height).toBe('number');
    expect(typeof transactionStatus.confirmed!.number_of_confirmations).toBe('number');

    expect(await arweave.transactions.verify(tx)).toBeTruthy();

    tx.signature = 'xxx';

    try {
      await arweave.transactions.verify(tx);
    } catch (e) {
      expect(e.message).toBe(
        "Invalid transaction signature or ID! The transaction ID doesn't match the expected SHA-256 hash of the signature.",
      );
    }
  });

  test('Get transaction data', async () => {
    const txRawData = await arweave.transactions.getData(liveDataTxid);
    expect(typeof txRawData).toBe('string');
    expect(txRawData).toContain('CjwhRE9DVFlQRSBodG1sPgo');

    const txDecodeData = await arweave.transactions.getData(liveDataTxid, {
      decode: true,
    });
    expect(txDecodeData.constructor.name).toBe('Uint8Array');

    const txDecodeStringData = await arweave.transactions.getData(liveDataTxid, { decode: true, string: true });
    expect(typeof txDecodeStringData).toBe('string');
    expect(txDecodeStringData).toContain('<title>ARWEAVE / PEER EXPLORER</title>');
  });

  test('Get transaction data > 12MiB from a gateway', async () => {
    const data = (await arweave.transactions.getData(liveDataTxidLarge, {
      decode: true,
    })) as Uint8Array;
    expect(data.byteLength).toEqual(14166765);
  }, 50000);

  test('Find transactions', async () => {
    const results = await arweave.transactions.search('Silo-Name', 'BmjRGIsemI77+eQb4zX8');

    expect(results).toBeInstanceOf(Array);
    expect(results).toContain('Sgmyo7nUqPpVQWUfK72p5yIpd85QQbhGaWAF-I8L6yE');
  });
});

async function pause(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
