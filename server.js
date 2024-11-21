require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
require('./routes/order.routes')(app);

// Database configuration
const dbConfig = {
    HOST: "0.0.0.0",
    PORT: 27017,
    DB: "kyoso_db"
};

const PORT = process.env.PORT || 3001;

// MongoDB connection
mongoose.connect(`mongodb://${dbConfig.HOST}:${dbConfig.PORT}/${dbConfig.DB}`)
    .then(() => {
        console.log("Successfully connected to MongoDB.");
    })
    .catch(err => {
        console.error("Connection error", err);
        process.exit();
    });

app.listen(PORT, () => {
  console.log(`Order Processor running on port ${PORT}`);
});