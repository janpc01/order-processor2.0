const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');
const shippingService = require('../services/shipping.service');
const { Order } = require('../models/order.model');
const ProcessedOrder = require('../models/processed-order.model');
const emailService = require('../services/email.service');
const driveService = require('../services/drive.service');

module.exports = function(app) {
    app.get("/api/fetch-order/:orderId", controller.fetchOrderDetails);

    app.post("/api/process-order", async (req, res) => {
        try {
            const { orderId } = req.body;
            
            const order = await Order.findById(orderId)
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
                originalOrderId: orderId,
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

            // Update original order status
            await Order.findByIdAndUpdate(order._id, {
                orderStatus: "Processed",
                trackingNumber: shippingResult.trackingNumber
            });

            // Send processing notification email
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
                driveLink: driveUpload.webViewLink,
                trackingNumber: shippingResult.trackingNumber
            });
        } catch (error) {
            res.status(500).json({ 
                message: "Error processing order",
                error: error.message 
            });
        }
    });
};