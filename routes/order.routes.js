const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');
const shippingService = require('../services/shipping.service');
const { Order } = require('../models/order.model');
const ProcessedOrder = require('../models/processed-order.model');
const emailService = require('../services/email.service');
const driveService = require('../services/drive.service');

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

            // Process cards and generate files regardless of order type
            const cardResults = await cardProcessor.processOrderWithPrintSheets(order.items);
            const shippingResult = await shippingService.generateShippingLabel(order);

            // Create zip file
            const zipPath = await driveService.createOrderZip(order._id, {
                printSheets: cardResults.success.map(r => r.printSheet.filepath),
                shippingLabel: shippingResult.filepath
            });

            // Upload to Google Drive
            const driveUpload = await driveService.uploadToGoogleDrive(zipPath, order._id);

            // Store processed order details
            const processedOrder = new ProcessedOrder({
                originalOrderId: order._id,
                driveFileId: driveUpload.fileId,
                driveFileLink: driveUpload.webViewLink,
                trackingNumber: shippingResult.trackingNumber,
                totalCardsProcessed: cardResults.totalProcessed,
                cardsPrintCount: order.items.map(item => ({
                    cardId: item.card._id,
                    quantity: item.quantity
                }))
            });

            await processedOrder.save();

            // Send confirmation to customer (both guest and registered users)
            await emailService.sendOrderConfirmation(order, driveUpload.webViewLink);

            // Send notification to admin
            await emailService.sendProcessingNotification(
                {
                    orderId: order._id,
                    trackingNumber: shippingResult.trackingNumber,
                    totalCardsProcessed: cardResults.totalProcessed
                },
                driveUpload.webViewLink
            );

            res.status(200).json({
                message: "Order processed successfully",
                processedOrder,
                result: cardResults
            });
        } catch (error) {
            console.error('Order processing error:', error);
            res.status(500).json({ 
                message: "Error processing order",
                error: error.message 
            });
        }
    });

    app.post("/api/process-order", async (req, res) => {
        try {
            const { orderId } = req.body;
            if (!orderId) {
                return res.status(400).json({ message: "Order ID is required" });
            }

            const order = await Order.findById(orderId)
                .populate({
                    path: 'items',
                    populate: {
                        path: 'card',
                        model: 'Card'
                    }
                });

            // Process cards and generate files
            const cardResults = await cardProcessor.processOrderWithPrintSheets(order.items);
            const shippingResult = await shippingService.generateShippingLabel(order);

            // Create zip file
            const zipPath = await driveService.createOrderZip(order._id, {
                printSheets: cardResults.success.map(r => r.printSheet.filepath),
                shippingLabel: shippingResult.filepath
            });

            // Upload to Google Drive
            const driveUpload = await driveService.uploadToGoogleDrive(zipPath, order._id);

            // Store processed order details
            const processedOrder = new ProcessedOrder({
                originalOrderId: order._id,
                driveFileId: driveUpload.fileId,
                driveFileLink: driveUpload.webViewLink,
                trackingNumber: shippingResult.trackingNumber,
                totalCardsProcessed: cardResults.totalProcessed,
                cardsPrintCount: order.items.map(item => ({
                    cardId: item.card._id,
                    quantity: item.quantity
                }))
            });

            await processedOrder.save();

            // Send confirmation to customer (both guest and registered users)
            await emailService.sendOrderConfirmation(order, driveUpload.webViewLink);

            // Send notification to admin
            await emailService.sendProcessingNotification(
                {
                    orderId: order._id,
                    trackingNumber: shippingResult.trackingNumber,
                    totalCardsProcessed: cardResults.totalProcessed
                },
                driveUpload.webViewLink
            );

            res.json({
                message: "Order processing completed",
                orderId: order._id,
                processedOrderId: processedOrder._id,
                driveLink: driveUpload.webViewLink
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