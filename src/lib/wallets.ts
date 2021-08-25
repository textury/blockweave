import { JWKInterface } from '../faces/lib/wallet';
import CryptoInterface from '../faces/utils/crypto';
import { b64UrlDecode, b64UrlEncode, bufferTob64 } from '../utils/buffer';
import Api from './api';
import * as B64js from '../utils/b64';
import ArCache from '../utils/arCache';
import { ArCacheInterface } from '../faces/utils/arCache';

export default class Wallets {
  private api: Api;
  private crypto: CryptoInterface;
  private cache: ArCacheInterface;

  constructor(api: Api, crypto: CryptoInterface, cache?: ArCacheInterface) {
    this.api = api;
    this.api = api;
    this.crypto = crypto;
    this.cache = cache;
  }

  /**
   * Get the wallet balance for a given wallet address.
   * @param  {string} address - Wallet address
   * @returns {Promise<string>} - Promise which resolves on a winston string balance.
   */
  public async getBalance(address: string): Promise<string> {
    let data = this.cache && ((await this.cache.get(`balance-${address}`)) as string);
    if (!data) {
      const res = await this.api.get(`wallet/${address}/balance`, {
        transformResponse: (d): string => d,
      });
      data = res.data;
      this.cache.set(`balance-${address}`, data, 2 * 60 * 1000);
    }

    return data;
  }

  /**
   * Get the last transaction ID for a given wallet address.
   * @param  {string} address - Wallet address
   * @returns {Promise<string>} - Promise which resolves on a transaction id as string.
   */
  public async getLastTransactionId(address: string): Promise<string> {
    let data: string = this.cache && (await this.cache.get(`lastTxId-${address}`));
    if (!data) {
      const res = await this.api.get(`wallet/${address}/last_tx`);
      data = res.data;
      this.cache.set(`lastTxId-${address}`, data, 2 * 60 * 1000);
    }
    return data;
  }

  /**
   * Generate a new Arweave wallet JSON object (JWK).
   * @returns Promise which resolves in the JWK.
   */
  public async generate(): Promise<JWKInterface> {
    return this.crypto.generateJWK();
  }

  public async jwkToAddress(jwk?: JWKInterface | 'use_wallet'): Promise<string> {
    if (!jwk || jwk === 'use_wallet') {
      return this.getAddress();
    }
    return this.getAddress(jwk);
  }

  public async getAddress(jwk?: JWKInterface | 'use_wallet'): Promise<string> {
    if (!jwk || jwk === 'use_wallet') {
      if (typeof window === 'undefined') {
        throw new Error('JWK must be provided.');
      }

      try {
        // @ts-ignore
        await window.arweaveWallet.connect(['ACCESS_ADDRESS']);
      } catch (e) {
        // Permission already granted.
      }

      try {
        // @ts-ignore
        const address = window.arweaveWallet.getActiveAddress();
        return address;
      } catch (e) {
        throw new Error('JWK must be provided.');
      }
    }

    return this.ownerToAddress(jwk.n);
  }

  public async ownerToAddress(owner: string): Promise<string> {
    let res: string = this.cache && (await this.cache.get(`ownerToAddress-${owner}`));
    if (!res) {
      res = b64UrlEncode(bufferTob64(await this.crypto.hash(new Uint8Array(B64js.toByteArray(b64UrlDecode(owner))))));
      this.cache && this.cache.set(`ownerToAddress-${owner}`, res);
    }

    return res;
  }
}
