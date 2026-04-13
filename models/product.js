/**
 * Product Model
 * This model defines the structure of the Product document in MongoDB.
 * It includes fields for name, description, brand, price, category, stock count, rating, reviews, featured status, images, and creation date.
 * The schema also includes a virtual property 'id' that maps to the MongoDB '_id' field for easier access.
 * Example usage:
 * const product = new Product({
 *  name: "Sample Product",
 *  description: "This is a sample product.",
 *  brand: "Sample Brand",
 *  price: 99.99,
 *  category: "60d5f9b8c2a1a4567890abcd", // ObjectId of a category
 *  countInStock: 10,
 *  rating: 4.5,
 *  numReviews: 100,
 *  isFeatured: true,
 *  images: ["image1.jpg", "image2.jpg"]
 * });
 */

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  oldPrice: {
    type: Number,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "subCategory",
    required: true,
  },
  countInStock: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  discount: {
    type: Number,
    default: 0,
  },
  reviews: [reviewSchema],
  dateCreated: {
    type: Date,
    default: Date.now,
  },
});

productSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
productSchema.set("toJSON", {
  virtuals: true,
});

exports.Product = mongoose.model("Product", productSchema);
exports.productSchema = productSchema;
