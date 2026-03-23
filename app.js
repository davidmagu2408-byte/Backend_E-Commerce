const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const verifyToken = require("./middlewares/jwt");

app.use(cors());
app.options("/", cors());

//middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
const productRoute = require("./routes/RouteProduct");
const brandRoute = require("./routes/RouteBrand");
const subCategoryRoute = require("./routes/RouteSubCategory");

const userRoute = require("./routes/RouteUser");
app.use("/api/subcategory", subCategoryRoute);
app.use("/api/category", categoryRoute);
app.use("/api/brand", brandRoute);
app.use("/api/product", productRoute);
app.use("/api/user", userRoute);
app.use(verifyToken);
