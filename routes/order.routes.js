const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');
const { Order } = require('../models/order.model');

module.exports = function(app) {
    app.get("/api/fetch-order/:orderId", controller.fetchOrderDetails);
    
    // Test endpoint for card processing
    app.get("/api/process-card/:cardId", async (req, res) => {
        try {
            const card = await cardProcessor.fetchCardInfo(req.params.cardId);
            const filepath = await cardProcessor.generateCardFile(card);
            res.json({ 
                message: "Card processed successfully",
                filepath,
                card 
            });
        } catch (error) {
            res.status(500).json({ 
                message: "Error processing card",
                error: error.message 
            });
        }
    });

    // Test endpoint for processing a card with random cards
    app.get("/api/process-card-with-randoms/:cardId", async (req, res) => {
        try {
            const result = await cardProcessor.processCardWithRandoms(req.params.cardId);
            res.json({
                message: "Card processed with random cards successfully",
                result
            });
        } catch (error) {
            res.status(500).json({
                message: "Error processing card with randoms",
                error: error.message
            });
        }
    });

    app.get("/api/process-order/:orderId", async (req, res) => {
        try {
            // Fetch order with populated items
            const order = await Order.findById(req.params.orderId)
                .populate({
                    path: 'items',
                    populate: {
                        path: 'card',
                        model: 'Card'
                    }
                });

            if (!order) {
                return res.status(404).json({ 
                    message: "Order not found" 
                });
            }

            if (!order.items || order.items.length === 0) {
                return res.status(400).json({ 
                    message: "Order has no items" 
                });
            }

            console.log(`Processing order ${order._id} with ${order.items.length} items`);
            
            const results = await cardProcessor.processOrderWithPrintSheets(order.items);
            
            res.json({
                message: "Order processing completed",
                orderId: order._id,
                results
            });
        } catch (error) {
            console.error('Order processing error:', error);
            res.status(500).json({ 
                message: "Error processing order",
                error: error.message 
            });
        }
    });
};