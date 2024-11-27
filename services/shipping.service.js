const fs = require('fs/promises');
const path = require('path');

class ShippingService {
    async generateShippingLabel(order) {
        try {
            const outputDir = path.join(__dirname, '../output/shipping-labels');
            await fs.mkdir(outputDir, { recursive: true });

            const shippingLabel = {
                orderId: order._id,
                shippingAddress: order.shippingAddress,
                totalItems: order.items.reduce((sum, item) => sum + item.quantity, 0),
                trackingNumber: this.generateTrackingNumber(),
                generatedAt: new Date().toISOString(),
                shippingMethod: "Standard", // Can be made configurable later
                packageDetails: {
                    weight: "TBD", // Can be calculated based on number of cards
                    dimensions: "TBD"
                }
            };

            const filename = `shipping_label_${order._id}_${Date.now()}.json`;
            const filepath = path.join(outputDir, filename);

            await fs.writeFile(
                filepath,
                JSON.stringify(shippingLabel, null, 2)
            );

            return {
                filepath,
                trackingNumber: shippingLabel.trackingNumber,
                shippingLabel
            };
        } catch (error) {
            throw error;
        }
    }

    generateTrackingNumber() {
        // Simple tracking number generation - can be replaced with actual shipping provider logic
        const prefix = 'KYOSO';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }
}

module.exports = new ShippingService();