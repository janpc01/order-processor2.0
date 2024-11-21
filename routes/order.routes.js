const controller = require('../controllers/order.controller');
const cardProcessor = require('../services/cardProcessor.service');

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
};