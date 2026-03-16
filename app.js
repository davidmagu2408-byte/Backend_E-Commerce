const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(cors());
app.options("/", cors());

//middleware
app.use(bodyParser.json());

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

//connect DB
mongoose
  .connect(process.env.CONNECTION_STRING)
  .then(() => {
    console.log("Database connection is ready");
    //Server
    app.listen(process.env.PORT, () => {
      console.log(`server is running http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

//Routes
const categoryRoute = require("./routes/RouteCategory");
app.use("/api/category", categoryRoute);
