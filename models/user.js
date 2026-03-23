const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    oldPassword: {
        type: String,
        required: false,
    },
    password: {
        type: String,
        required: true,
    },
    isAdmin: {
        type: Boolean,
        required: true,
        default: false,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
});

userSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
userSchema.set("toJSON", {
    virtuals: true,
});

exports.User = mongoose.model("User", userSchema);
exports.userSchema = userSchema;