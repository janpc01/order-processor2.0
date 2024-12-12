require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// MongoDB Connection
mongoose
    .connect(process.env.CUSTOMCONNSTR_ORDER_PROCESSOR_DB, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "order_processor_db"
    })
    .then(() => {
        console.log("Successfully connected to Azure Cosmos DB for Order Processor.");
    })
    .catch((err) => {
        console.error("Connection error", err);
        process.exit(1);
    });

// CORS Configuration
const allowedOrigins = [
    "https://kyosocards.com",
    "https://www.kyosocards.com",
    "https://mango-plant-0d19e2110.4.azurestaticapps.net",
    "https://blue-cliff-0a661b310.4.azurestaticapps.net",
    "https://order-processor-ewexgkcvhnhzbqhc.canadacentral-01.azurewebsites.net",
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie']
}));

// Middleware
app.use(express.json());

// Routes
require('./routes/order.routes')(app);



// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// Server Port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Order Processor running on port ${PORT}`);
});
