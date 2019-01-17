import { Meteor } from "meteor/meteor";
import Links from "/imports/api/links";
import Users from "/imports/api/users";
import Transactions from "/imports/api/transactions";
import Chain from "/imports/api/chain";

function insertLink(title, url) {
  Links.insert({ title, url, createdAt: new Date() });
}

Meteor.startup(() => {
  if (Users.find().count() === 0) {
    Users.insert({ name: "Igor", role: "owner" });
    Users.insert({ name: "Michael", role: "contact" });
  }
});
