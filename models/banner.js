const mongoose = require("mongoose");

const BannerSchema = mongoose.Schema({
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
    type: {
        type: String,
        required: true,
    },
});

BannerSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
BannerSchema.set("toJSON", {
    virtuals: true,
});

exports.Banner = mongoose.model("Banner", BannerSchema);
exports.BannerSchema = BannerSchema;