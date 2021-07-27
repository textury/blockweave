export interface Chunk {
  dataHash: Uint8Array;
  minByteRange: number;
  maxByteRange: number;
}

interface BranchNode {
  readonly id: Uint8Array;
  readonly type: "branch";
  readonly byteRange: number;
  readonly maxByteRange: number;
  readonly leftChild?: MerkleNode;
  readonly rightChild?: MerkleNode;
}

export interface LeafNode {
  readonly id: Uint8Array;
  readonly dataHash: Uint8Array;
  readonly type: "leaf";

  readonly minByteRange: number;
  readonly maxByteRange: number;
}

export interface Proof {
  offset: number;
  proof: Uint8Array;
}

export type MerkleNode = BranchNode | LeafNode;