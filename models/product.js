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

const moongoose = require("mongoose");

const productSchema = new moongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: moongoose.Schema.Types.ObjectId,
    ref: "Category",
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

exports.Product = moongoose.model("Product", productSchema);
exports.productSchema = productSchema;
