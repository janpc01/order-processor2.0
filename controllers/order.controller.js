const { Order, OrderItem } = require('../models/order.model');
const Card = require('../models/card.model');

exports.fetchOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId)
            .populate({
                path: 'items',
                populate: {
                    path: 'card',
                    model: 'Card',
                    select: 'name image beltRank achievement clubName price'
                }
            });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json(order);
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ message: "Error fetching order details", error: err.message });
    }
};