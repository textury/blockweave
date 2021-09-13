import { AxiosResponse } from 'axios';
import Blockweave from '../blockweave';
import CryptoInterface from '../faces/utils/crypto';
import { SerializedUploader } from '../faces/utils/transactionUploader';
import Api from '../lib/api';
import Transaction from '../lib/transaction';
import { b64UrlToBuffer } from './buffer';
import Merkle from './merkle';

// Maximum amount of chunks we will upload in the body.
const MAX_CHUNKS_IN_BODY = 1;

// We assume these errors are intermitment and we can try again after a delay:
// - not_joined
// - timeout
// - data_root_not_found (we may have hit a node that just hasn't seen it yet)
// - exceeds_disk_pool_size_limit
// We also try again after any kind of unexpected network errors

// Errors from /chunk we should never try and continue on.
const FATAL_CHUNK_UPLOAD_ERRORS = [
  'invalid_json',
  'chunk_too_big',
  'data_path_too_big',
  'offset_too_big',
  'data_size_too_big',
  'chunk_proof_ratio_not_attractive',
  'invalid_proof',
];

// Amount we will delay on receiving an error response but do want to continue.
const ERROR_DELAY = 1000 * 40;

export class TransactionUploader {
  private chunkIndex: number = 0;
  private txPosted: boolean = false;
  private transaction: Transaction;
  private data: Uint8Array;
  private lastRequestTimeEnd: number = 0;
  private totalErrors = 0; // Not serialized.

  public lastResponseStatus: number = 0;
  public lastResponseError: string = '';

  private blockweave: Blockweave;
  private crypto: CryptoInterface;
  private merkle: Merkle;

  public get isComplete(): boolean {
    return this.txPosted && this.chunkIndex === this.transaction.chunks!.chunks.length;
  }

  public get totalChunks(): number {
    return this.transaction.chunks!.chunks.length;
  }

  public get uploadedChunks(): number {
    return this.chunkIndex;
  }

  public get pctComplete(): number {
    return Math.trunc((this.uploadedChunks / this.totalChunks) * 100);
  }

  constructor(blockweave: Blockweave, transaction: Transaction | SerializedUploader | string, crypto: CryptoInterface) {
    this.blockweave = blockweave;
    this.crypto = crypto;
    this.merkle = new Merkle();

    if (transaction instanceof Transaction) {
      if (!transaction.id) {
        throw new Error(`Transaction is not signed`);
      }
      if (!transaction.chunks) {
        throw new Error(`Transaction chunks not prepared`);
      }
      // Make a copy of transaction, zeroing the data so we can serialize.
      this.data = transaction.data;
      this.transaction = new Transaction(Object.assign({}, transaction, { data: new Uint8Array(0) }), this.blockweave);
    }
  }

  /**
   * Uploads the next part of the transaction.
   * On the first call this posts the transaction
   * itself and on any subsequent calls uploads the
   * next chunk until it completes.
   */
  public async uploadChunk(): Promise<void> {
    if (this.isComplete) {
      throw new Error(`Upload is already complete`);
    }

    if (this.lastResponseError !== '') {
      this.totalErrors++;
    } else {
      this.totalErrors = 0;
    }

    // We have been trying for about an hour receiving an
    // error every time, so eventually bail.
    if (this.totalErrors === 100) {
      throw new Error(`Unable to complete upload: ${this.lastResponseStatus}: ${this.lastResponseError}`);
    }

    let delay =
      this.lastResponseError === '' ? 0 : Math.max(this.lastRequestTimeEnd + ERROR_DELAY - Date.now(), ERROR_DELAY);

    if (delay > 0) {
      // Jitter delay bcoz networks, subtract up to 30% from 40 seconds
      delay = delay - delay * Math.random() * 0.3;
      // tslint:disable-next-line: no-shadowed-variable
      await new Promise((res) => setTimeout(res, delay));
    }

    this.lastResponseError = '';

    if (!this.txPosted) {
      await this.postTransaction();
      return;
    }

    const chunk = this.transaction.getChunk(this.chunkIndex, this.data);

    const chunkOk = await this.merkle.validatePath(
      this.transaction.chunks!.data_root,
      parseInt(chunk.offset, 10),
      0,
      parseInt(chunk.data_size, 10),
      b64UrlToBuffer(chunk.data_path),
    );
    if (!chunkOk) {
      throw new Error(`Unable to validate chunk ${this.chunkIndex}`);
    }

    // Catch network errors and turn them into objects with status -1 and an error message.
    const res = await this.blockweave.api.post(`chunk`, this.transaction.getChunk(this.chunkIndex, this.data)).catch((e) => {
      console.error(e.message);
      return { status: -1, data: { error: e.message } };
    });

    this.lastRequestTimeEnd = Date.now();
    this.lastResponseStatus = res.status;

    if (this.lastResponseStatus === 200) {
      this.chunkIndex++;
    } else {
      // @ts-ignore
      this.lastResponseError = res.data || res.statusText || '';
      if (FATAL_CHUNK_UPLOAD_ERRORS.includes(this.lastResponseError)) {
        throw new Error(`Fatal error uploading chunk ${this.chunkIndex}: ${this.lastResponseError}`);
      }
    }
  }

  /**
   * Reconstructs an upload from its serialized state and data.
   * Checks if data matches the expected data_root.
   *
   * @param serialized
   * @param data
   */
  public static async fromSerialized(
    blockweave: Blockweave,
    serialized: SerializedUploader,
    data: Uint8Array,
    crypto: CryptoInterface,
  ): Promise<TransactionUploader> {
    if (!serialized || typeof serialized.chunkIndex !== 'number' || typeof serialized.transaction !== 'object') {
      throw new Error(`Serialized object does not match expected format.`);
    }

    // Everything looks ok, reconstruct the TransactionUpload,
    // prepare the chunks again and verify the data_root matches

    const upload = new TransactionUploader(blockweave, new Transaction(serialized.transaction, blockweave), crypto);

    // Copy the serialized upload information, and data passed in.
    upload.chunkIndex = serialized.chunkIndex;
    upload.lastRequestTimeEnd = serialized.lastRequestTimeEnd;
    upload.lastResponseError = serialized.lastResponseError;
    upload.lastResponseStatus = serialized.lastResponseStatus;
    upload.txPosted = serialized.txPosted;
    upload.data = data;

    await upload.transaction.prepareChunks(data);

    if (upload.transaction.data_root !== serialized.transaction.data_root) {
      throw new Error(`Data mismatch: Uploader doesn't match provided data.`);
    }

    return upload;
  }

  /**
   * Reconstruct an upload from the tx metadata, ie /tx/<id>.
   *
   * @param api
   * @param id
   * @param data
   */
  public static async fromTransactionId(api: Api, id: string): Promise<SerializedUploader> {
    const resp = await api.get(`tx/${id}`);

    if (resp.status !== 200) {
      throw new Error(`Tx ${id} not found: ${resp.status}`);
    }

    const transaction = resp.data;
    transaction.data = new Uint8Array(0);

    const serialized: SerializedUploader = {
      txPosted: true,
      chunkIndex: 0,
      lastResponseError: '',
      lastRequestTimeEnd: 0,
      lastResponseStatus: 0,
      transaction,
    };

    return serialized;
  }

  public toJSON() {
    return {
      chunkIndex: this.chunkIndex,
      transaction: this.transaction,
      lastRequestTimeEnd: this.lastRequestTimeEnd,
      lastResponseStatus: this.lastResponseStatus,
      lastResponseError: this.lastResponseError,
      txPosted: this.txPosted,
    };
  }

  // POST to /tx
  private async postTransaction(): Promise<void> {
    const uploadInBody = this.totalChunks <= MAX_CHUNKS_IN_BODY;

    let res: Partial<AxiosResponse>;
    if (uploadInBody) {
      // Post the transaction with data.
      this.transaction.data = this.data;
      try {
        res = await this.blockweave.api.post(`tx`, this.transaction);
      } catch (e) {
        console.error(e);
        res = { status: -1, data: { error: e.message } };
      }

      this.lastRequestTimeEnd = Date.now();
      this.lastResponseStatus = res.status;
      this.transaction.data = new Uint8Array(0);

      if (res.status >= 200 && res.status < 300) {
        // We are complete.
        this.txPosted = true;
        this.chunkIndex = MAX_CHUNKS_IN_BODY;
        return;
      }
      // @ts-ignore
      this.lastResponseError = res.data || res.statusText || '';
      throw new Error(`Unable to upload transaction: ${res.status}, ${this.lastResponseError}`);
    }

    // Post the transaction with no data.
    res = await this.blockweave.api.post(`tx`, this.transaction);
    this.lastRequestTimeEnd = Date.now();
    this.lastResponseStatus = res.status;
    if (!(res.status >= 200 && res.status < 300)) {
      this.lastResponseError = res.data || res.statusText || '';
      throw new Error(`Unable to upload transaction: ${res.status}, ${this.lastResponseError}`);
    }
    this.txPosted = true;
  }

  /**
   * Gets an uploader than can be used to upload a transaction chunk by chunk, giving progress
   * and the ability to resume.
   *
   * @param upload a Transaction object, a previously save progress object, or a transaction id.
   * @param data the data of the transaction. Required when resuming an upload.
   */
  async getUploader(
    upload: Transaction | SerializedUploader | string,
    data?: Uint8Array | ArrayBuffer,
  ): Promise<TransactionUploader> {
    let uploader!: TransactionUploader;

    if (upload instanceof Transaction) {
      uploader = new TransactionUploader(this.blockweave, upload, this.crypto);
    } else {
      if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
      }

      if (!data || data.constructor.name !== 'Uint8Array') {
        throw new Error(`Must provide data when resuming upload`);
      }

      if (typeof upload === 'string') {
        upload = await TransactionUploader.fromTransactionId(this.blockweave.api, upload);
      }

      // upload should be a serialized upload.
      uploader = await TransactionUploader.fromSerialized(this.blockweave, upload, data as Uint8Array, this.crypto);
    }

    return uploader;
  }

  /**
   * Async generator version of uploader
   * @param {Transaction|SerializedUploader|string} upload a Transaction object, a previously save uploader, or a transaction id.
   * @param {Uint8Array} data the data of the transaction. Required when resuming an upload.
   */
  async *upload(upload: Transaction | SerializedUploader | string, data?: Uint8Array) {
    const uploader = await this.getUploader(upload, data);

    while (!uploader.isComplete) {
      await uploader.uploadChunk();
      yield uploader;
    }

    return uploader;
  }
}
