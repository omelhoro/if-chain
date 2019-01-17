import React from "react";
import { withTracker } from "meteor/react-meteor-data";
import Users from "../api/users";
import Transactions from "../api/transactions";
import Chain from "../api/chain";
import { withState, compose } from "recompose";
import classNames from "classnames";

const createUser = evt => {
  evt.preventDefault();
  const form = evt.target;
  const formData = new FormData(form);
  const user = Array.from(formData.entries()).reduce(
    (agg, [key, value]) => ({ ...agg, [key]: value }),
    {}
  );

  if (!user.name) {
    return alert("No name provided");
  }

  Users.insert(user);
  form.reset();
};

const createTransaction = evt => {
  evt.preventDefault();

  const form = evt.target;
  const formData = new FormData(form);
  const transaction = Array.from(formData.entries()).reduce(
    (agg, [key, value]) => ({ ...agg, [key]: value }),
    {}
  );

  if (!transaction.amount || transaction.amount <= 0) {
    return alert("No correct amount provided");
  }

  Transactions.insert(transaction);
  form.reset();
};

const UsersView = ({
  users,
  transactions,
  state: { selectedContact },
  setState,
  chain
}) => {
  console.log(users);

  const owner = users.find(user => user.role === "owner");
  const contacts = users.filter(user => user.role === "contact");

  const unminedTransactions = transactions.filter(tr => !tr.mined);

  if (!users.length) {
    return <div>Loading</div>;
  }
  return (
    <div>
      <h3 className="text-xl mb-3 mt-3">Account belongs to {owner.name}</h3>
      <h4>Contacts</h4>
      <ul className="list-reset">
        {contacts.map(contact => (
          <li key={contact._id} style={{ display: "flex" }}>
            <div className="m-2" style={{ width: "120px" }}>
              {contact.name}
            </div>
            <button
              className="m-2 p-2 border-red border border-solid "
              onClick={() => Users.remove(contact._id)}
            >
              Remove
            </button>
            <button
              className="m-2 p-2  border-green border border-solid "
              onClick={() => setState({ selectedContact: contact })}
            >
              Send Money
            </button>
          </li>
        ))}
      </ul>
      <h4>Create new contact</h4>
      <form onSubmit={createUser}>
        <input
          className="m-2 border border-black "
          name="name"
          type="text"
          placeholder="Name of contact"
          style={{ width: "120px" }}
        />
        <input
          name="role"
          readOnly
          hidden
          type="text"
          placeholder=""
          value="contact"
        />
        <button
          className="m-2 p-2 border-blue border border-solid "
          type="submit"
        >
          Create
        </button>
      </form>
      {selectedContact && (
        <form
          className="m-2 pr-2 pl-2 border border-orange flex justify-between"
          onSubmit={createTransaction}
        >
          <div>
            Send
            <input
              className="m-2 border border-black "
              name="amount"
              type="number"
              placeholder="Amount"
            />
            $ to{" "}
            <span className="underline" style={{ width: "120px" }}>
              {selectedContact.name}
            </span>
            <input
              name="recipientId"
              type="text"
              hidden
              readOnly
              value={selectedContact._id}
            />
            <input
              name="recipientName"
              type="text"
              hidden
              readOnly
              value={selectedContact.name}
            />
            <input
              name="sender"
              type="text"
              hidden
              readOnly
              value={owner._id}
            />
          </div>

          <div>
            <button
              className="m-2 p-2 border-blue border border-solid pin-r"
              type="submit"
            >
              Send
            </button>
          </div>
        </form>
      )}
      <h4>Current Transactions</h4>
      <ul className="list-reset">
        {transactions.map(transaction => {
          const mined = Boolean(transaction.mined);
          return (
            <li className={classNames("m-2")} key={transaction._id}>
              Sending <b>{transaction.amount}$</b> to{" "}
              {transaction.recipientName}
              <div className="p-1 text-m">
                <span
                  className={classNames(mined ? "text-green" : "text-orange")}
                >
                  Status: {mined ? "Executed" : "In process"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <h3 className="text-xl mb-3 mt-3">
        Blochain Size: {chain.blocks.length}
      </h3>
      <h4>Blocks</h4>
      <ul className="list-reset">
        {chain.blocks.map(block => (
          <li className="m-2" key={block.hash}>
            {new Date(block.timestamp).toLocaleString()}: {block.hash}
          </li>
        ))}
      </ul>
    </div>
  );
};

console.log(Chain.find(), Users);
export default compose(
  withTracker(() => ({
    users: Users.find().fetch(),
    transactions: Transactions.find().fetch(),
    chain: Chain.find().fetch()[0]
  })),
  withState("state", "setState", { selectedContact: null })
)(UsersView);
