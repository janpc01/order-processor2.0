const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    card: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true },
    quantity: { type: Number, required: true, min: 1 },
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "OrderItem", required: true }],
    shippingAddress: {
        fullName: String,
        addressLine1: String,
        addressLine2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
        phone: String
    },
    totalAmount: Number,
    orderStatus: String,
    paymentStatus: String
}, { timestamps: true });

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
const Order = mongoose.model("Order", orderSchema);

module.exports = { Order, OrderItem };