require("dotenv").config();
const app = require("./server/app");
const connectDB = require("./server/config/db");

connectDB();
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
