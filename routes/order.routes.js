const controller = require('../controllers/order.controller');

module.exports = function(app) {
    app.get("/api/fetch-order/:orderId", controller.fetchOrderDetails);
};