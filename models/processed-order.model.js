const mongoose = require('mongoose');

const processedOrderSchema = new mongoose.Schema({
    originalOrderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Order", 
        required: true 
    },
    printSheetPaths: [String],
    shippingLabelPath: String,
    trackingNumber: String,
    processedAt: { 
        type: Date, 
        default: Date.now 
    },
    status: {
        type: String,
        enum: ['completed', 'failed'],
        default: 'completed'
    },
    totalCardsProcessed: Number,
    cardsPrintCount: [{
        cardId: mongoose.Schema.Types.ObjectId,
        quantity: Number
    }]
}, { timestamps: true });

module.exports = mongoose.model('ProcessedOrder', processedOrderSchema);