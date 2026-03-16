/**
 * Category Schema
 *
 * Defines the structure for product categories in the e-commerce system.
 *
 * @typedef {Object} Category
 * @property {string} name - The name of the category (required)
 * @property {string[]} images - Array of image URLs for the category (required)
 * @property {string} color - The color associated with the category (required)
 * @property {string} id - Virtual property that returns the MongoDB ObjectId as a hexadecimal string
 *
 * @example
 * const category = {
 *   name: "Electronics",
 *   images: ["image1.jpg", "image2.jpg"],
 *   color: "#FF5733"
 * }
 */
const mongoose = require("mongoose");

const categorySchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  color: {
    type: String,
    required: true,
  },
});

categorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});
categorySchema.set("toJSON", {
  virtuals: true,
});

exports.Category = mongoose.model("Category", categorySchema);
exports.categorySchema = categorySchema;
