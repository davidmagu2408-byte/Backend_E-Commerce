const { Order } = require("../models/order");
const { Product } = require("../models/product");
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/jwt");

// Create order
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, note } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
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

    const order = new Order({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      paymentMethod: paymentMethod || "cod",
      subtotal,
      shippingFee,
      total,
      note: note || "",
      paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
    });

    const savedOrder = await order.save();

    // Decrease stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: -item.quantity },
      });
    }

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công!",
      order: savedOrder,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get my orders
router.get("/my-orders", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 8;
    const totalDocs = await Order.countDocuments({ user: req.user._id });
    const totalPages = Math.ceil(totalDocs / perPage);

    const orders = await Order.find({ user: req.user._id })
      .sort({ dateCreated: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      success: true,
      orders,
      totalPages,
      page,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get order by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate(
      "items.product",
      "name images price"
    );
    if (!order) {
      return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    }
    // Only allow owner to see their order
    if (order.user.toString() !== req.user._id) {
      return res.status(403).json({ success: false, message: "Không có quyền truy cập" });
    }
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel order (only if pending)
router.put("/:id/cancel", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    }
    if (order.user.toString() !== req.user._id) {
      return res.status(403).json({ success: false, message: "Không có quyền" });
    }
    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể huỷ đơn hàng đang chờ xử lý",
      });
    }

    order.orderStatus = "cancelled";
    await order.save();

    // Restore stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { countInStock: item.quantity },
      });
    }

    res.status(200).json({ success: true, message: "Đã huỷ đơn hàng", order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get all orders
router.get("/", verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = 10;
    const totalDocs = await Order.countDocuments();
    const totalPages = Math.ceil(totalDocs / perPage);

    const orders = await Order.find()
      .populate("user", "name email phone")
      .sort({ dateCreated: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      success: true,
      orders,
      totalPages,
      page,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update order status
router.put("/:id/status", verifyToken, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const update = {};
    if (orderStatus) update.orderStatus = orderStatus;
    if (paymentStatus) update.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Đơn hàng không tồn tại" });
    }
    res.status(200).json({ success: true, message: "Cập nhật thành công", order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
