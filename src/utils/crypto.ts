import { JWKInterface } from '../faces/lib/wallet';
import CryptoInterface, { SignatureOptions } from '../faces/utils/crypto';
import { concatBuffers, stringToBuffer } from './buffer';
import { webcrypto } from 'crypto';

export default class CryptoDriver implements CryptoInterface {
  public readonly keyLength = 4096;
  public readonly publicExponent = new Uint8Array([0x01, 0x00, 0x01]);
  public readonly hashAlgorithm = 'SHA-256';
  public driver: SubtleCrypto;

  constructor() {
    if (typeof crypto !== 'undefined') {
      this.driver = crypto.subtle;
    }

    if (!this.driver) {
      if (typeof webcrypto === 'undefined') {
        webcrypto = { configurable: false, enumerable: true, get() { return lazyRequire('internal/crypto/webcrypto').crypto; } };
      }
      // @ts-ignore
      this.driver = webcrypto.subtle;
    }
  }

  public async generateJWK(): Promise<JWKInterface> {
    const cryptoKey = await this.driver.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: this.keyLength,
        publicExponent: this.publicExponent,
        hash: this.hashAlgorithm,
      },
      true,
      ['sign'],
    );

    const jwk = await this.driver.exportKey('jwk', cryptoKey.privateKey);

    return {
      kty: jwk.kty!,
      e: jwk.e!,
      n: jwk.n!,
      d: jwk.d!,
      p: jwk.p!,
      q: jwk.q!,
      dp: jwk.dp!,
      dq: jwk.dq!,
      qi: jwk.qi!,
    };
  }

  public async sign(jwk: JWKInterface, data: Uint8Array, signOpts: SignatureOptions = {}): Promise<Uint8Array> {
    const signature = await this.driver.sign(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      await this.jwkToCryptoKey(jwk),
      data,
    );

    return new Uint8Array(signature);
  }

  public async hash(data: Uint8Array, algorithm: string = this.hashAlgorithm): Promise<Uint8Array> {
    const digest = await this.driver.digest(algorithm, data);
    return new Uint8Array(digest);
  }

  public async verify(publicModulus: string, data: Uint8Array, signature: Uint8Array): Promise<boolean> {
    const publicKey = {
      kty: 'RSA',
      e: 'AQAB',
      n: publicModulus,
    };

    const key = await this.jwkToPublicCryptoKey(publicKey);
    const verifyWith32 = this.driver.verify(
      {
        name: 'RSA-PSS',
        saltLength: 32,
      },
      key,
      signature,
      data,
    );

    const verifyWith0 = this.driver.verify(
      {
        name: 'RSA-PSS',
        saltLength: 0,
      },
      key,
      signature,
      data,
    );

    return verifyWith32 || verifyWith0;
  }

  public async encrypt(data: Buffer, key: string | Buffer, salt?: string): Promise<Uint8Array> {
    const intialKey = await this.driver.importKey(
      'raw',
      typeof key === 'string' ? stringToBuffer(key) : key,
      {
        name: 'PBKDF2',
        length: 32,
      },
      false,
      ['deriveKey'],
    );

    const derivedKey = await this.driver.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt ? stringToBuffer(salt) : stringToBuffer('salt'),
        iterations: 100000,
        hash: this.hashAlgorithm,
      },
      intialKey,
      {
        name: 'AES-CBC',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt'],
    );

    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);

    const encryptedData = await this.driver.encrypt(
      {
        name: 'AES-CBC',
        iv,
      },
      derivedKey,
      data,
    );

    return concatBuffers([iv, encryptedData, encryptedData]);
  }

  public async decrypt(encrypted: Buffer, key: string | Buffer, salt?: string): Promise<Uint8Array> {
    const intialKey = await this.driver.importKey(
      'raw',
      typeof key === 'string' ? stringToBuffer(key) : key,
      {
        name: 'PBKDF2',
        length: 32,
      },
      false,
      ['deriveKey'],
    );

    const derivedKey = await this.driver.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt ? stringToBuffer(salt) : stringToBuffer('salt'),
        iterations: 100000,
        hash: this.hashAlgorithm,
      },
      intialKey,
      {
        name: 'AES-CBC',
        length: 256,
      },
      false,
      ['encrypt', 'decrypt'],
    );

    const iv = encrypted.slice(0, 16);

    const data = await this.driver.decrypt(
      {
        name: 'AES-CBC',
        iv,
      },
      derivedKey,
      encrypted.slice(16),
    );

    return new Uint8Array(data);
  }

  private async jwkToCryptoKey(jwk: JWKInterface): Promise<CryptoKey> {
    return this.driver.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-PSS',
        hash: this.hashAlgorithm,
      },
      false,
      ['sign'],
    );
  }

  private async jwkToPublicCryptoKey(publicJwk: JWKInterface): Promise<CryptoKey> {
    return this.driver.importKey(
      'jwk',
      publicJwk,
      {
        name: 'RSA-PSS',
        hash: this.hashAlgorithm,
      },
      false,
      ['verify'],
    );
  }
}
