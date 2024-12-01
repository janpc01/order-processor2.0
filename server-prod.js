require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
require('./routes/order.routes')(app);

const PORT = process.env.PORT || 3001;

// MongoDB connection
mongoose.connect("mongodb://kyoso-db:CpZ0svqG8rrveYGMuJxI8KldLzHg5evj0QGGZARkA6seberWJDztXRnHFaEp8RDx3bvpPOdiXQCmACDbu2QACg%3D%3D@kyoso-db.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@kyoso-db@")
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
