const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv/config");
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const cookieParser = require("cookie-parser");

const ALLOWED_ORIGINS = [
  'https://client-demo-ecommerce.vercel.app',
  'https://admin-demo-ecommerce.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174'
];
const corsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Cho phép cả OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization'],
};

//middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
const bannerRoute = require("./routes/RouteBanner");

app.use("/api/subcategory", subCategoryRoute);
app.use("/api/category", categoryRoute);
app.use("/api/brand", brandRoute);
app.use("/api/product", productRoute);
app.use("/api/user", userRoute);
app.use("/api/banner", bannerRoute);
