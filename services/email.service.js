const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        const requiredVars = ['EMAIL_USER', 'EMAIL_PASSWORD'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            throw new Error(`Missing required email configuration: ${missingVars.join(', ')}`);
        }

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendProcessingNotification(orderDetails, driveLink) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `Order ${orderDetails.orderId} Processed`,
            text: `
                Order Processing Complete

                Order ID: ${orderDetails.orderId}
                Tracking Number: ${orderDetails.trackingNumber}
                Total Cards Processed: ${orderDetails.totalCardsProcessed}

                Files available at: ${driveLink}

                Processing Time: ${new Date().toISOString()}
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new EmailService();