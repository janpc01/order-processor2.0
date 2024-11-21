const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
    name: String,
    beltRank: String,
    achievement: String,
    clubName: String,
    image: String,
    price: Number,
    userId: mongoose.Schema.Types.ObjectId,
    printCount: Number
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);