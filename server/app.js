const express = require("express");
const app = express();
const cors = require("cors");
const morgan = require("morgan")
const { credential } = require("firebase-admin");
const authRoutes = require("./routes/auth.routes");

app.use(cors({ origin: [process.env.CLIENT_URL], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/auth", authRoutes);

module.exports = app;
