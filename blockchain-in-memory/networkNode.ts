import express from "express";
import bodyParser from "body-parser";
import Blockchain from "./blockchain";
import Joi from "joi";
import axios from "axios";
import _ from "lodash";

const port = process.env.PORT || 10000;
const OWN_URL = `http://localhost:${port}`;

const coin = new Blockchain(OWN_URL);

const app = express();

app.use(bodyParser.json());

const transactionModel = Joi.object().keys({
  amount: Joi.number()
    .required()
    .greater(0),
  sender: Joi.string().required(),
  recipient: Joi.string().required(),
  id: Joi.string().optional()
});

const modelValidationMd = (model: Joi.Schema) => (req, res, next) => {
  const transaction = req.body;
  const result = model.validate(transaction);
  if (result.error) {
    res.status(500).json({ error: result.error });
  } else {
    next();
  }
};

const getAllChains = async () => {
  const chainData = await Promise.all(
    coin.networkNodes.map(nodeUrl =>
      axios.get<{ chain: any[]; networkName: string }>(nodeUrl + "/chain")
    )
  );

  return chainData.map(({ data }) => data);
};

app.post("/transaction", modelValidationMd(transactionModel), (req, res) => {
  const transaction = req.body;
  const nextBlockIndex = coin.addToPendingTransactions(transaction);
  res.json({ success: true, scheduledBlock: nextBlockIndex });
});

app.post(
  "/broadcast-transaction",
  modelValidationMd(transactionModel),
  async (req, res) => {
    const transaction = coin.createTransaction(req.body);
    coin.addToPendingTransactions(transaction);
    await Promise.all(
      coin.networkNodes.map(nodeUrl =>
        axios.post(nodeUrl + "/transaction", transaction)
      )
    );
    res.json({ note: `Broadcast successfull to ${coin.networkNodes.length}` });
  }
);

app.get("/chain", (_, res) => {
  res.json(coin);
});

app.get("/mine", async (_, res) => {
  const nonce = coin.proofOfWork();
  const hash = coin.hashBlockWithNonce(nonce);
  console.log("Nonce =  ", nonce);
  const newBlock = coin.createNewBlock(nonce, hash);

  coin.addBlock(newBlock);

  await Promise.all(
    coin.networkNodes.map(nodeUrl =>
      axios.post(nodeUrl + "/receive-new-block", { newBlock })
    )
  );

  const transaction = coin.createTransaction({
    amount: 12.5,
    sender: "00",
    recipient: OWN_URL
  });
  coin.addToPendingTransactions(transaction);

  await Promise.all(
    coin.networkNodes.map(nodeUrl =>
      axios.post(nodeUrl + "/transaction", transaction)
    )
  );

  res.json({ success: true, blockAdded: coin.getLastBlock().index });
});

app.post("/receive-new-block", (req, res) => {
  const { newBlock } = req.body;
  const hash = coin.hashBlockWithNonce(newBlock.nonce);
  if (hash === newBlock.hash) {
    coin.addBlock(newBlock);
    res.json({ note: "Accepted" });
  } else {
    res.status(400).json({ note: "Denied: Nonce is not valid" });
  }
});

app.post("/register-and-broadcast-node", async (req, res) => {
  const newNodeUrl = req.body.url;

  const regNodePromises = coin.networkNodes.map(nodeUrl =>
    axios.post(nodeUrl + "/register-node", { url: newNodeUrl })
  );

  await Promise.all(regNodePromises);

  await axios.post(newNodeUrl + "/register-bulk-nodes", {
    urls: coin.networkNodes.concat(OWN_URL)
  });

  if (!coin.networkNodes.includes(newNodeUrl))
    coin.networkNodes.push(newNodeUrl);

  res.json({ note: "Success" });
});

app.post("/register-node", (req, res) => {
  const url = req.body.url;
  if (!coin.networkNodes.includes(url)) coin.networkNodes.push(url);
  res.json({ note: "Success" });
});

app.post("/register-bulk-nodes", (req, res) => {
  const urls: string[] = req.body.urls;
  urls.forEach(url => {
    if (!coin.networkNodes.includes(url) && OWN_URL !== url)
      coin.networkNodes.push(url);
  });

  res.json({ note: "Success" });
});

app.get("/consensus", async (_req, res) => {
  const networkCoins = await getAllChains();
  const longerThanCurrentChain = networkCoins.filter(
    networkCoin => networkCoin.chain.length > coin.chain.length
  );

  if (!longerThanCurrentChain.length) {
    return res.json({ note: "No chain is longer than my current" });
  } else {
    const newLongestCoin = longerThanCurrentChain.find(networkCoin =>
      coin.chainIsValid(networkCoin)
    );
    if (!newLongestCoin) {
      return res.json({ note: "No valid chain is longer than my current" });
    } else {
      coin.useChain(newLongestCoin);
      return res.json({
        note:
          "Current chain was updated from node " + newLongestCoin.networkName
      });
    }
  }
});

app.post("/_insert-fake-block", (_, res) => {
  const transaction = coin.createTransaction({
    amount: 10000,
    sender: "USA",
    recipient: "ME"
  });
  coin.addBlock({
    nonce: 100,
    transactions: [transaction],
    hash: "0000123213213",
    index: coin.chain.length,
    previousBlockHash: coin.chain[coin.chain.length - 1].hash,
    timestamp: Date.now()
  });
  res.json({ note: "Successfully inserted fake block" });
});

app.listen(port, () => {
  console.log(`Node listering now on port ${port}`);
});
