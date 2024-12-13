require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

console.log("Starting Order Processor Server...");

// --- Environment Variable Check ---
console.log("Environment Variables:");
console.log(`PORT: ${process.env.PORT || 8080}`);
console.log(`CUSTOMCONNSTR_COSMOSDB_CONNECTION_STRING: ${process.env.CUSTOMCONNSTR_COSMOSDB_CONNECTION_STRING ? "Defined" : "NOT DEFINED"}`);

// --- MongoDB Connection ---
console.log("Attempting to connect to MongoDB...");
mongoose
    .connect(process.env.CUSTOMCONNSTR_COSMOSDB_CONNECTION_STRING, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        dbName: "kyoso_db"
    })
    .then(() => {
        console.log("Successfully connected to Azure Cosmos DB for Order Processor.");
    })
    .catch((err) => {
        console.error("Connection error to MongoDB:", err.message);
        process.exit(1);
    });

// --- CORS Configuration ---
console.log("Configuring CORS...");
const allowedOrigins = [
    "https://kyosocards.com",
    "https://www.kyosocards.com",
    "https://mango-plant-0d19e2110.4.azurestaticapps.net",
    "https://blue-cliff-0a661b310.4.azurestaticapps.net",
    "https://kyoso-backend-dhheg8akajdre6ce.canadacentral-01.azurewebsites.net",
];

app.use(cors({
    origin: (origin, callback) => {
        console.log(`CORS Check - Origin: ${origin}`);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Error: Origin ${origin} not allowed`);
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie']
}));

// --- Middleware ---
console.log("Configuring Middleware...");
app.use(express.json());

// --- Health Check Route ---
app.get('/health', (req, res) => {
    console.log("Health check route accessed.");
    res.status(200).send("Order Processor is healthy.");
});

// --- Routes ---
console.log("Configuring Routes...");
try {
    require('./routes/order.routes')(app);
    console.log("Routes loaded successfully.");
} catch (err) {
    console.error("Error loading routes:", err.message);
    process.exit(1);
}

// --- Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error("Error Handling Middleware Triggered:");
    console.error("Error Stack:", err.stack);
    res.status(500).json({ message: "Something went wrong!", error: err.message });
});

// --- Server Start ---
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Order Processor running on port ${PORT}`);
}).on('error', (err) => {
    console.error("Server failed to start:", err.message);
    process.exit(1);
});
