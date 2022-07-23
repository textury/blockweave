/**
 * @see {@link https://github.com/BlockweaveTeam/arweave/blob/fbc381e0e36efffa45d13f2faa6199d3766edaa2/apps/arweave/src/ar_merkle.erl}
 */

import Blockweave from '../blockweave';
import { Chunk, MerkleNode, LeafNode, Proof } from '../faces/utils/merkle';
import { concatBuffers } from './buffer';

export const MAX_CHUNK_SIZE = 256 * 1024;
export const MIN_CHUNK_SIZE = 32 * 1024;
const NOTE_SIZE = 32;
const HASH_SIZE = 32;

export default class Merkle {
  public async generateTransactionChunks(data: Uint8Array): Promise<{
    data_root: Uint8Array;
    chunks: Chunk[];
    proofs: Proof[];
  }> {
    const chunks = await this.chunkData(data);
    const leaves = await this.generateLeaves(chunks);
    const root = await this.buildLayers(leaves);
    const proofs = await this.generateProofs(root);

    const lastChunk = chunks.slice(-1)[0];
    if (lastChunk.maxByteRange - lastChunk.minByteRange === 0) {
      chunks.splice(chunks.length - 1, 1);
      proofs.splice(proofs.length - 1, 1);
    }

    return {
      data_root: root.id,
      chunks,
      proofs,
    };
  }

  /**
   * Takes the input data and chunks it into mostly equal sized chunks.
   * The last chunk will be a bit smaller as it contains the remainder
   * from the chunk process.
   * @params {Uint8Array} data - The data to be split.
   */
  public async chunkData(data: Uint8Array): Promise<Chunk[]> {
    const chunks: Chunk[] = [];

    let rest = data;
    let cursor = 0;

    while (rest.length >= MAX_CHUNK_SIZE) {
      let chunkSize = MAX_CHUNK_SIZE;

      // If the last chunk is too small, then we need to adjust the chunk size
      const nextChunkSize = rest.byteLength - MAX_CHUNK_SIZE;
      if (nextChunkSize > 0 && nextChunkSize < MIN_CHUNK_SIZE) {
        chunkSize = Math.ceil(rest.byteLength / 2);
      }

      const chunk = rest.slice(0, chunkSize);
      const dataHash = await Blockweave.crypto.hash(chunk);
      cursor += chunk.byteLength;
      chunks.push({
        dataHash,
        minByteRange: cursor - chunk.byteLength,
        maxByteRange: cursor,
      });
      rest = rest.slice(chunkSize);
    }

    chunks.push({
      dataHash: await Blockweave.crypto.hash(rest),
      minByteRange: cursor,
      maxByteRange: cursor + rest.byteLength,
    });

    return chunks;
  }

  public async generateLeaves(chunks: Chunk[]): Promise<LeafNode[]> {
    return Promise.all(
      chunks.map(async ({ dataHash, minByteRange, maxByteRange }): Promise<LeafNode> => {
        return {
          type: 'leaf',
          id: await this.hash(await Promise.all([this.hash(dataHash), this.hash(this.intToBuffer(maxByteRange))])),
          dataHash,
          minByteRange,
          maxByteRange,
        };
      }),
    );
  }

  public async generateProofs(root: MerkleNode) {
    const proofs = this.resolveBranchProofs(root);
    if (!Array.isArray(proofs)) {
      return [proofs];
    }

    return this.arrayFlatten<Proof>(proofs);
  }

  public async computeRootHash(data: Uint8Array): Promise<Uint8Array> {
    const rootNode = await this.generateTree(data);
    return rootNode.id;
  }

  public async generateTree(data: Uint8Array): Promise<MerkleNode> {
    const rootNode = await this.buildLayers(await this.generateLeaves(await this.chunkData(data)));
    return rootNode;
  }

  public async buildLayers(nodes: MerkleNode[], level = 0): Promise<MerkleNode> {
    if (nodes.length < 2) {
      const root = await this.hashBranch(nodes[0], nodes[1]);
      return root;
    }

    const nextLayer: MerkleNode[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      nextLayer.push(await this.hashBranch(nodes[i], nodes[i + 1]));
    }

    return this.buildLayers(nextLayer, level + 1);
  }

  public arrayFlatten<T = any>(input: T[]): T[] {
    const flat: any[] = [];

    input.forEach((item) => {
      if (Array.isArray(item)) {
        flat.push(...this.arrayFlatten(item));
      } else {
        flat.push(item);
      }
    });

    return flat;
  }

  public intToBuffer(note: number): Uint8Array {
    const buffer = new Uint8Array(NOTE_SIZE);
    for (let i = buffer.length - 1; i > 0; i--) {
      const byte = note % 256;
      buffer[i] = byte;
      note = (note - byte) / 256;
    }
    return buffer;
  }

  public async validatePath(
    id: Uint8Array,
    dest: number,
    leftBound: number,
    rightBound: number,
    path: Uint8Array,
  ): Promise<{ offset: number; leftBound: number; rightBound: number; chunkSize: number }> {
    if (rightBound <= 0) {
      return;
    }

    if (dest >= rightBound) {
      return this.validatePath(id, 0, rightBound - 1, rightBound, path);
    }

    if (dest < 0) {
      return this.validatePath(id, 0, 0, rightBound, path);
    }

    if (path.length === HASH_SIZE + NOTE_SIZE) {
      const pathData = path.slice(0, HASH_SIZE);
      const endOffsetBuffer = path.slice(pathData.length, pathData.length + NOTE_SIZE);

      const pathDataHash = await this.hash([await this.hash(pathData), await this.hash(endOffsetBuffer)]);
      const result = this.arrayCompare(id, pathDataHash);
      if (result) {
        return {
          offset: rightBound - 1,
          leftBound,
          rightBound,
          chunkSize: rightBound - leftBound,
        };
      }
      return;
    }

    const left = path.slice(0, HASH_SIZE);
    const right = path.slice(left.length, left.length + HASH_SIZE);
    const offsetBuffer = path.slice(left.length + right.length, left.length + right.length + NOTE_SIZE);
    const offset = this.bufferToInt(offsetBuffer);

    const remainder = path.slice(left.length + right.length + offsetBuffer.length);

    const pathHash = await this.hash([await this.hash(left), await this.hash(right), await this.hash(offsetBuffer)]);

    if (this.arrayCompare(id, pathHash)) {
      if (dest < offset) {
        return await this.validatePath(left, dest, leftBound, Math.min(rightBound, offset), remainder);
      }
      return await this.validatePath(right, dest, Math.max(leftBound, offset), rightBound, remainder);
    }

    return;
  }

  public bufferToInt(buffer: Uint8Array): number {
    let result = 0;
    for (const i of buffer) {
      result = result * 256 + i;
    }
    return result;
  }

  public arrayCompare(a: Uint8Array, b: Uint8Array): boolean {
    return a.every((value: any, index: any) => b[index] === value);
  }

  private async hashBranch(left: MerkleNode, right: MerkleNode): Promise<MerkleNode> {
    if (!right) {
      return left;
    }

    return {
      type: 'branch',
      id: await this.hash([
        await this.hash(left.id),
        await this.hash(right.id),
        await this.hash(this.intToBuffer(left.maxByteRange)),
      ]),
      byteRange: left.maxByteRange,
      maxByteRange: right.maxByteRange,
      leftChild: left,
      rightChild: right,
    };
  }

  private async hash(data: Uint8Array | Uint8Array[]): Promise<Uint8Array> {
    if (Array.isArray(data)) {
      data = concatBuffers(data);
    }

    return new Uint8Array(await Blockweave.crypto.hash(data));
  }

  private resolveBranchProofs(node: MerkleNode, proof: Uint8Array = new Uint8Array(), depth = 0): Proof | Proof[] {
    if (node.type === 'leaf') {
      return {
        offset: node.maxByteRange - 1,
        proof: concatBuffers([proof, node.dataHash, this.intToBuffer(node.maxByteRange)]),
      };
    }

    if (node.type === 'branch') {
      const partialProof = concatBuffers([
        proof,
        node.leftChild!.id!,
        node.rightChild!.id!,
        this.intToBuffer(node.byteRange),
      ]);
      return [
        this.resolveBranchProofs(node.leftChild!, partialProof, depth + 1),
        this.resolveBranchProofs(node.rightChild!, partialProof, depth + 1),
      ] as [Proof, Proof];
    }

    throw new Error(`Unexpected node type`);
  }
}
