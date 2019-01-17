import sha256 from "sha256";
import { MongoClient, Db, Collection } from "mongodb";

interface IBlock {
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
}

interface IChain {
  blocks: IBlock[];
}

export default class Blockchain {
  // chain: IBlock[] = [];
  // pendingTransactions: ITransaction[] = [];
  mongoClient: MongoClient;
  db?: Db;
  chainCol?: Collection;
  transactionsCol?: Collection;

  constructor(networkUrl: string) {
    this.mongoClient = new MongoClient(networkUrl);

    this.mongoClient.connect(async err => {
      console.error(err);
      if (err) throw err;
      this.db = this.mongoClient.db("banking-app");
      this.chainCol = this.db.collection("chain");
      this.transactionsCol = this.db.collection("transactions");
      if (!(await this.getChain())) {
        await this.chainCol.insertOne({ blocks: [] });
        this.createNewBlock(100, "0", "0");
      }
    });
  }

  async getChain(): Promise<IChain> {
    return await this.chainCol.findOne({});
  }

  async getPendingTransactions() {
    return await this.transactionsCol.find({
      $or: [{ mined: { $exists: false } }, { mined: false }]
    });
  }

  async resetPendingTransactions() {
    return await this.transactionsCol.updateMany(
      {
        $or: [{ mined: { $exists: false } }, { mined: false }]
      },
      { $set: { mined: true } }
    );
  }

  appendBlock(block: IBlock) {
    if (this.chainCol) {
      this.chainCol.updateOne({}, { $push: { blocks: block } });
    }
  }

  async createNewBlock(
    nonce: number,
    hash: string,
    _previousBlockHash?: string
  ) {
    const previousBlockHash =
      _previousBlockHash || (await this.getLastBlock()).hash;
    const chain = await this.getChain();
    const pendingTransactions = await (await this.getPendingTransactions()).toArray();

    const newBlock = {
      index: chain.blocks.length + 1,
      timestamp: Date.now(),
      transactions: pendingTransactions,
      nonce,
      hash,
      previousBlockHash
    };

    await this.appendBlock(newBlock);
    await this.resetPendingTransactions();
  }

  async hashBlock(nonce: number): Promise<string> {
    const previousBlockHash = (await this.getLastBlock()).hash;
    const pendingTransactions = await (await this.getPendingTransactions()).toArray();
    const data =
      previousBlockHash +
      nonce.toString() +
      JSON.stringify(pendingTransactions);

    return sha256(data);
  }

  // createTransaction(transaction: ITransaction) {
  //   this.pendingTransactions.push(transaction);
  // }

  async getLastBlock() {
    const chain = await this.getChain();
    if (chain) {
      return chain.blocks[chain.blocks.length - 1];
    }
  }

  async waitForNewTransactions() {
    return new Promise(res => {
      const interval = setInterval(async () => {
        if (this.transactionsCol) {
          const nDocs = await (await this.getPendingTransactions()).count();

          if (nDocs) {
            clearInterval(interval);
            res(nDocs);
          }
        }
      }, 5000);
    });
  }

  async *mineBlock() {
    while (true) {
      const nDocs = await this.waitForNewTransactions();
      console.log(`Mining nonce for ${nDocs} transactions`);
      yield this.proofOfWork();
    }
  }

  async proofOfWork(): Promise<number> {
    let nonce = 0;
    let hash = await this.hashBlock(nonce);

    while (!hash.startsWith("ff")) {
      nonce++;
      hash = await this.hashBlock(nonce);
    }

    return nonce;
  }
}
