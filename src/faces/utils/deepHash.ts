export interface DeepHashChunks extends Array<DeepHashChunk> {}
export type DeepHashChunk = Uint8Array | DeepHashChunks;