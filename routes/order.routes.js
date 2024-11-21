const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');
const shippingService = require('../services/shipping.service');
const { Order } = require('../models/order.model');
const ProcessedOrder = require('../models/processed-order.model');
const emailService = require('../services/email.service');

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
                return res.status(404).json({ message: "Order not found" });
            }

            // Process cards and generate print sheets
            const cardResults = await cardProcessor.processOrderWithPrintSheets(order.items);
            
            // Generate shipping label
            const shippingResult = await shippingService.generateShippingLabel(order);

            // Update print counts for all cards
            const printCountUpdates = await Promise.all(
                order.items.map(item => 
                    cardProcessor.incrementPrintCount(item.card._id, item.quantity)
                )
            );

            // Store processed order details
            const processedOrder = new ProcessedOrder({
                originalOrderId: order._id,
                printSheetPaths: cardResults.success.map(r => r.printSheet.filepath),
                shippingLabelPath: shippingResult.filepath,
                trackingNumber: shippingResult.trackingNumber,
                totalCardsProcessed: cardResults.totalProcessed,
                cardsPrintCount: order.items.map(item => ({
                    cardId: item.card._id,
                    quantity: item.quantity
                }))
            });

            await processedOrder.save();

            // Send email notification
            await emailService.sendProcessingNotification(
                {
                    orderId: order._id,
                    trackingNumber: shippingResult.trackingNumber,
                    totalCardsProcessed: cardResults.totalProcessed
                },
                {
                    printSheets: cardResults.success.map(r => r.printSheet.filepath),
                    shippingLabel: shippingResult.filepath
                }
            );

            res.json({
                message: "Order processing completed",
                orderId: order._id,
                processedOrderId: processedOrder._id,
                cardResults,
                shipping: shippingResult,
                printCountUpdates
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