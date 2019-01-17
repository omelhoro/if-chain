import sha256 from "sha256";

export interface IBlock {
  index: number;
  timestamp: number;
  transactions: ITransaction[];
  nonce: number;
  hash: string;
  previousBlockHash: string;
}

interface ITransaction {
  amount: number;
  sender: string;
  recipient: string;
  id?: string;
}

const hashBlock = (
  nonce: number,
  prevBlockHash: string,
  curBlockData: ITransaction[]
) => {
  const data = prevBlockHash + nonce.toString() + JSON.stringify(curBlockData);
  return sha256(data);
};

const createTransaction = (transaction: ITransaction): ITransaction => {
  return {
    ...transaction,
    id: Math.random()
      .toString()
      .slice(2)
  };
};

const isValidPoW = (hash: string) => {
  return hash.startsWith("fffff");
};

export default class Blockchain {
  chain: IBlock[] = [];
  pendingTransactions: ITransaction[] = [];
  networkNodes: string[] = [];

  constructor(public networkName: string) {
    const block = this.createNewBlock(100, "0", "0");
    this.addBlock(block);
  }

  createNewBlock(
    nonce: number,
    hash: string,
    _previousBlockHash?: string
  ): IBlock {
    const previousBlockHash = _previousBlockHash || this.getLastBlock().hash;

    const newBlock = {
      index: this.chain.length + 1,
      timestamp: Date.now(),
      transactions: this.pendingTransactions,
      nonce,
      hash,
      previousBlockHash
    };

    return newBlock;
  }

  addBlock(block: IBlock) {
    this.pendingTransactions = [];
    this.chain.push(block);
  }

  hashBlockWithNonce(nonce: number): string {
    const previousBlockHash = this.getLastBlock().hash;
    const currentBlockData = this.pendingTransactions;
    return hashBlock(nonce, previousBlockHash, currentBlockData);
  }

  addToPendingTransactions(transaction: ITransaction) {
    this.pendingTransactions.push(transaction);
    return this.getLastBlock().index + 1;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  proofOfWork(): number {
    let nonce = 0;
    let hash = this.hashBlockWithNonce(nonce);

    while (!isValidPoW(hash)) {
      nonce++;
      hash = this.hashBlockWithNonce(nonce);
    }

    return nonce;
  }

  createTransaction = createTransaction;
  hashBlock = hashBlock;

  useChain(coin) {
    this.chain = coin.chain;
    this.pendingTransactions = coin.pendingTransactions;
  }

  chainIsValid(coin: { chain: IBlock[]; networkName: string }): boolean {
    return coin.chain.every((block, ix, array) => {
      if (ix === 0) {
        const genBlockValid =
          block.nonce === 100 && block.hash === "0" && block.index === 1;
        if (!genBlockValid) {
          console.log("Gen block not valid from =", coin.networkName);
        }
        return genBlockValid;
      } else {
        const prevBlock = array[ix - 1];
        const blockHash = hashBlock(
          block.nonce,
          prevBlock.hash,
          block.transactions
        );

        const isValid = isValidPoW(blockHash);

        if (!isValid) {
          console.log("Chain not valid from =", coin.networkName);
        }

        return isValid;
      }
    });
  }
}
