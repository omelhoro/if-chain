import assert from "assert";
import axios from "axios";
import { IBlock } from "./blockchain";
// const assert = require("assert");

const nodes = {
  one: "http://localhost:10001",
  two: "http://localhost:10002",
  three: "http://localhost:10003"
};

const lateNodes = {
  four: "http://localhost:10004"
};

interface IChainResponse {
  chain: any[];
  networkName: string;
  networkNodes: string[];
  pendingTransactions: any[];
}

async function getAllChains() {
  return await Promise.all(
    Object.values(nodes).map(nodeUrl =>
      axios.get<IChainResponse>(`${nodeUrl}/chain`)
    )
  );
}

async function consentAllChains() {
  return await Promise.all(
    Object.values({ ...nodes, ...lateNodes }).map(nodeUrl =>
      axios.get<IChainResponse>(`${nodeUrl}/consensus`)
    )
  );
}

async function main() {
  await axios.post(`${nodes.one}/register-and-broadcast-node`, {
    url: nodes.two
  });

  await axios.post(`${nodes.one}/register-and-broadcast-node`, {
    url: nodes.three
  });

  (await getAllChains()).forEach(({ data: { networkNodes, networkName } }) =>
    assert.equal(networkNodes.length, 2, networkName)
  );

  await axios.post(`${nodes.two}/broadcast-transaction`, {
    amount: 10,
    sender: "000123",
    recipient: "ADSASD"
  });

  await axios.post(`${nodes.three}/broadcast-transaction`, {
    amount: 1000,
    sender: "000123",
    recipient: "ADSASD"
  });

  (await getAllChains()).forEach(
    ({ data: { pendingTransactions, networkName } }) =>
      assert.equal(pendingTransactions.length, 2, networkName)
  );

  await axios
    .post(`${nodes.two}/receive-new-block`, {
      newBlock: {
        hash: "123",
        index: 2,
        nonce: 123213,
        previousBlockHash: "123123123s",
        timestamp: Date.now(),
        transactions: [{ amount: 1000e10, sender: "USA", recipient: "Me" }]
      } as IBlock
    })
    .catch(err => console.log(err.response.data));

  (await getAllChains()).forEach(
    ({ data: { pendingTransactions, networkName } }) =>
      assert.equal(pendingTransactions.length, 2, networkName)
  );

  await axios.get(`${nodes.two}/mine`);

  (await getAllChains()).forEach(
    ({ data: { pendingTransactions, chain, networkName } }) => {
      assert.equal(pendingTransactions.length, 1, networkName);
      assert.equal(chain.length, 2, networkName);
    }
  );

  await axios.get(`${nodes.one}/mine`);

  (await getAllChains()).forEach(
    ({ data: { pendingTransactions, chain, networkName } }) => {
      assert.equal(pendingTransactions.length, 1, networkName);
      assert.equal(chain.length, 3, networkName);
    }
  );

  await axios.get(`${nodes.three}/mine`);

  (await getAllChains()).forEach(
    ({ data: { pendingTransactions, chain, networkName } }) => {
      assert.equal(pendingTransactions.length, 1, networkName);
      assert.equal(chain.length, 4, networkName);
    }
  );

  await axios.post(`${nodes.two}/register-and-broadcast-node`, {
    url: lateNodes.four
  });

  await axios.post(`${nodes.three}/_insert-fake-block`);

  const {
    data: { note: note1 }
  } = await axios.get(`${lateNodes.four}/consensus`);

  assert.equal(
    note1,
    "Current chain was updated from node http://localhost:10001"
  );

  const {
    data: { chain }
  } = await axios.get(`${lateNodes.four}/chain`);

  assert.equal(chain.length, 4);

  const {
    data: { note: note2 }
  } = await axios.get(`${nodes.three}/consensus`);

  assert.equal(note2, "No chain is longer than my current");
}

main();
