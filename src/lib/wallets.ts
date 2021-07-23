import { JWKInterface } from '../faces/lib/wallet';
import CryptoInterface from '../faces/utils/crypto';
import { b64UrlDecode, b64UrlEncode, bufferTob64 } from '../utils/buffer';
import Api from './api';
import * as B64js from '../utils/b64';
import Cache from '../utils/cache';

export default class Wallets {
  private api: Api;
  private crypto: CryptoInterface;

  constructor(api: Api, crypto: CryptoInterface) {
    this.api = api;
    this.crypto = crypto;
  }

  /**
   * Get the wallet balance for a given wallet address.
   * @param  {string} address - Wallet address
   * @returns {Promise<string>} - Promise which resolves on a winston string balance.
   */
  public async getBalance(address: string): Promise<string> {
    const res = await this.api.get(`wallet/${address}/balance`, {
      transformResponse: [(data): string => data],
    });
    return res.data;
  }

  /**
   * Get the last transaction ID for a given wallet address.
   * @param  {string} address - Wallet address
   * @returns {Promise<string>} - Promise which resolves on a transaction id as string.
   */
  public async getLastTxId(address: string): Promise<string> {
    const res = await this.api.get(`wallet/${address}/last_tx`);
    return res.data;
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
    return b64UrlEncode(bufferTob64(await this.crypto.hash(new Uint8Array(B64js.toByteArray(b64UrlDecode(owner))))));
  }
}
