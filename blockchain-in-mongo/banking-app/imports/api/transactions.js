import { Mongo } from "meteor/mongo";

export default (Transactions = new Mongo.Collection("transactions"));
