require("dotenv").config({ override: true });
const app = require("./server/app");
const connectDB = require("./server/config/db");
const { ensureSearchIndexes } = require("./server/search/searchIndexes");

const port = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await ensureSearchIndexes();

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
};

startServer();
