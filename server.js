require("dotenv").config();
const express = require("express");
const connectDB = require("./server/api/config/db");
const app = express();

connectDB()
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
