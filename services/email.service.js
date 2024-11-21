const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async sendProcessingNotification(orderDetails, files) {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `Order ${orderDetails.orderId} Processed`,
            text: `
Order Processing Complete

Order ID: ${orderDetails.orderId}
Tracking Number: ${orderDetails.trackingNumber}
Total Cards Processed: ${orderDetails.totalCardsProcessed}

Files Generated:
- Print Sheets: ${files.printSheets.length}
- Shipping Label: ${files.shippingLabel}

Processing Time: ${new Date().toISOString()}
            `,
            attachments: [
                // Attach shipping label
                {
                    filename: `shipping_label_${orderDetails.orderId}.json`,
                    path: files.shippingLabel
                },
                // Attach first print sheet as example
                {
                    filename: `print_sheet_example_${orderDetails.orderId}.json`,
                    path: files.printSheets[0]
                }
            ]
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Processing notification email sent');
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();