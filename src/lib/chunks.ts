import { TransactionChunkResponseInterface, TransactionOffsetResponseInterface } from '../faces/lib/chunks';
import { b64UrlToBuffer } from '../utils/buffer';
import Api from './api';

export default class Chunks {
  private api: Api;

  constructor(api: Api) {
    this.api = api;
  }

  public async getTransactionOffset(id: string): Promise<TransactionOffsetResponseInterface> {
    const resp = await this.api.get(`tx/${id}/offset`);
    if (resp.status === 200) {
      return resp.data;
    }
    throw new Error(
      `Unable to get the transaction offset: ${resp.data ? resp.data.error || resp.statusText : 'unknown'}`,
    );
  }

  public async getChunk(offset: string | number | BigInt): Promise<TransactionChunkResponseInterface> {
    const resp = await this.api.get(`${offset}/chunk`);
    if (resp.status === 200) {
      return resp.data;
    }
    throw new Error(
      `Unable to get the transaction chunk: ${resp.data ? resp.data.error || resp.statusText : 'unknown'}`,
    );
  }

  public async getChunkData(offset: string | number | BigInt): Promise<Uint8Array> {
    const chunk = await this.getChunk(offset);
    const buf = b64UrlToBuffer(chunk.chunk);
    return buf;
  }

  public firstChunkOffset(offsetResponse: TransactionOffsetResponseInterface): number {
    return parseInt(offsetResponse.offset, 10) - parseInt(offsetResponse.size, 10) + 1;
  }

  public async downloadchunkedData(id: string): Promise<Uint8Array> {
    const offsetResponse = await this.getTransactionOffset(id);

    const size = parseInt(offsetResponse.size, 10);
    const endOffset = parseInt(offsetResponse.offset, 10);
    const startOffset = endOffset - size + 1;

    const data = new Uint8Array(size);
    let byte = 0;

    while (startOffset + byte < endOffset) {
      const chunkData = await this.getChunkData(startOffset + byte);
      data.set(chunkData, byte);
      byte += chunkData.length;
    }

    return data;
  }
}
