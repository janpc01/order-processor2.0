const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');
const shippingService = require('../services/shipping.service');
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

            console.log(`Processing order ${order._id} with ${order.items.length} items`);
            
            // Process cards and generate print sheets
            const cardResults = await cardProcessor.processOrderWithPrintSheets(order.items);
            
            // Generate shipping label
            console.log('Generating shipping label...');
            const shippingResult = await shippingService.generateShippingLabel(order);

            res.json({
                message: "Order processing completed",
                orderId: order._id,
                cardResults,
                shipping: shippingResult
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