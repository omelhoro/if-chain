import React from "react";
import Hello from "./Hello.jsx";
import Info from "./Info.jsx";
import Users from "./Users";

const App = () => (
  <div>
    <h1 className="text-center">Welcome to the Blockchain Banking App</h1>
    <h4 className="text-center">by Software Unchained</h4>
    <Users />
  </div>
);

export default App;
