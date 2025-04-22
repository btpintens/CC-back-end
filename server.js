import db from "./db/connection.js";
import express from "express";
import mongoose from "mongoose";
import logger from "morgan";
import chalk from "chalk";
import cors from "cors";

// import routes
import routes from "./routes/index.js";
// import cors

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(logger('dev'));

// routes
app.use("/api", routes);
db.on('connected', () => {
    console.clear();
    console.log(chalk.blue('Connected to MongoDB'));
});

app.listen(PORT, () => {
    console.log(chalk.green(`Express server is running on port ${PORT}`));
});