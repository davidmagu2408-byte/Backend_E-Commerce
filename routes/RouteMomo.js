const express = require("express");
const crypto = require("crypto");
const axios = require("axios");
const { Order } = require("../models/order");
const { Product } = require("../models/product");
const verifyToken = require("../middlewares/jwt");

const router = express.Router();

const MOMO_CONFIG = {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint:
        process.env.NODE_ENV === "production"
            ? "https://payment.momo.vn/v2/gateway/api/create"
            : "https://test-payment.momo.vn/v2/gateway/api/create",
    ipnUrl: process.env.MOMO_IPN_URL, // e.g. https://your-backend.com/api/momo/ipn
    redirectUrl: process.env.MOMO_REDIRECT_URL, // e.g. https://your-client.com/payment-result
};

// Create MoMo payment
router.post("/create", verifyToken, async (req, res) => {
    try {
        const { items, shippingAddress, note } = req.body;

        if (!items || items.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "Giỏ hàng trống" });
        }

        // Validate stock & build order items
        const orderItems = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Sản phẩm không tồn tại: ${item.productId}`,
                });
            }
            if (product.countInStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm "${product.name}" chỉ còn ${product.countInStock} trong kho`,
                });
            }
            const lineTotal = product.price * item.quantity;
            subtotal += lineTotal;
            orderItems.push({
                product: product._id,
                name: product.name,
                image: product.images[0],
                price: product.price,
                quantity: item.quantity,
            });
        }

        const shippingFee = subtotal >= 500000 ? 0 : 30000;
        const total = subtotal + shippingFee;

        // Create order in DB with pending payment
        const order = new Order({
            user: req.user._id,
            items: orderItems,
            shippingAddress,
            paymentMethod: "momo",
            subtotal,
            shippingFee,
            total,
            note: note || "",
            paymentStatus: "pending",
        });

        const savedOrder = await order.save();

        // Build MoMo payment request
        const orderId = `MOMO_${savedOrder._id}_${Date.now()}`;
        const requestId = orderId;
        const orderInfo = `Thanh toán đơn hàng #${savedOrder._id}`;
        const amount = Math.round(total);
        const extraData = Buffer.from(
            JSON.stringify({ orderId: savedOrder._id.toString() })
        ).toString("base64");

        const rawSignature = [
            `accessKey=${MOMO_CONFIG.accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `ipnUrl=${MOMO_CONFIG.ipnUrl}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${MOMO_CONFIG.partnerCode}`,
            `redirectUrl=${MOMO_CONFIG.redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=payWithMethod`,
        ].join("&");

        const signature = crypto
            .createHmac("sha256", MOMO_CONFIG.secretKey)
            .update(rawSignature)
            .digest("hex");

        const momoPayload = {
            partnerCode: MOMO_CONFIG.partnerCode,
            partnerName: "E-Commerce Store",
            storeId: MOMO_CONFIG.partnerCode,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl: MOMO_CONFIG.redirectUrl,
            ipnUrl: MOMO_CONFIG.ipnUrl,
            lang: "vi",
            requestType: "payWithMethod",
            autoCapture: true,
            extraData,
            signature,
        };

        const momoResponse = await axios.post(MOMO_CONFIG.endpoint, momoPayload);

        if (momoResponse.data.resultCode === 0) {
            // Save MoMo orderId reference
            savedOrder.momoOrderId = orderId;
            await savedOrder.save();

            // Decrease stock
            for (const item of orderItems) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { countInStock: -item.quantity },
                });
            }

            return res.status(200).json({
                success: true,
                payUrl: momoResponse.data.payUrl,
                orderId: savedOrder._id,
            });
        } else {
            // MoMo rejected — remove unpaid order
            await Order.findByIdAndDelete(savedOrder._id);
            return res.status(400).json({
                success: false,
                message:
                    momoResponse.data.message || "Không thể tạo thanh toán MoMo",
            });
        }
    } catch (err) {
        console.error("MoMo create error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// MoMo IPN (Instant Payment Notification) — called by MoMo servers
router.post("/ipn", async (req, res) => {
    try {
        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            responseTime,
            extraData,
            signature,
        } = req.body;

        // Verify signature
        const rawSignature = [
            `accessKey=${MOMO_CONFIG.accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `orderType=${orderType}`,
            `partnerCode=${partnerCode}`,
            `payType=${payType}`,
            `requestId=${requestId}`,
            `responseTime=${responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`,
        ].join("&");

        const expectedSignature = crypto
            .createHmac("sha256", MOMO_CONFIG.secretKey)
            .update(rawSignature)
            .digest("hex");

        if (signature !== expectedSignature) {
            console.error("MoMo IPN: Invalid signature");
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        // Find order by momoOrderId
        const order = await Order.findOne({ momoOrderId: orderId });
        if (!order) {
            console.error("MoMo IPN: Order not found for", orderId);
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (resultCode === 0) {
            order.paymentStatus = "paid";
        } else {
            order.paymentStatus = "failed";
            // Restore stock on failed payment
            for (const item of order.items) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: { countInStock: item.quantity },
                });
            }
        }

        await order.save();

        // MoMo expects 204 on success
        res.status(204).send();
    } catch (err) {
        console.error("MoMo IPN error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Check MoMo payment status (client polls after redirect back)
router.get("/status/:orderId", verifyToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res
                .status(404)
                .json({ success: false, message: "Đơn hàng không tồn tại" });
        }
        if (order.user.toString() !== req.user._id) {
            return res
                .status(403)
                .json({ success: false, message: "Không có quyền truy cập" });
        }
        res.status(200).json({
            success: true,
            paymentStatus: order.paymentStatus,
            orderStatus: order.orderStatus,
            orderId: order._id,
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
