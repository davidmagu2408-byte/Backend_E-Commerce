const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    name: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    items: [orderItemSchema],
    shippingAddress: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        province: { type: String, required: true },
        district: { type: String, required: true },
        ward: { type: String, required: true },
    },
    paymentMethod: {
        type: String,
        enum: ["cod", "banking", "momo"],
        default: "cod",
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
    },
    momoOrderId: { type: String, default: "" },
    orderStatus: {
        type: String,
        enum: ["pending", "confirmed", "shipping", "delivered", "cancelled"],
        default: "pending",
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
    note: { type: String, default: "" },
    dateCreated: { type: Date, default: Date.now },
});

orderSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
orderSchema.set("toJSON", { virtuals: true });

exports.Order = mongoose.model("Order", orderSchema);
