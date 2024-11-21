const nodemailer = require('nodemailer');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class EmailService {
    constructor() {
        console.log('Initializing email service...');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.ADMIN_EMAIL) {
            console.error('Missing email configuration');
        }

        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    async createZipFile(files, orderId) {
        return new Promise((resolve, reject) => {
            const outputDir = path.join(__dirname, '../output/temp');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const outputPath = path.join(outputDir, `print_sheets_${orderId}.zip`);
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            output.on('close', () => {
                console.log(`Zip file created: ${archive.pointer()} bytes`);
                resolve(outputPath);
            });

            archive.on('error', (err) => {
                reject(err);
            });

            archive.pipe(output);

            // Add print sheet files to the zip
            files.printSheets.forEach((filePath, index) => {
                archive.file(filePath, { 
                    name: `print_sheet_${index + 1}.json` 
                });
            });

            archive.finalize();
        });
    }

    async sendProcessingNotification(orderDetails, driveLink) {
        console.log('Preparing to send email notification...');
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.ADMIN_EMAIL,
            subject: `Order ${orderDetails.orderId} Processed`,
            text: `
Order Processing Complete

Order ID: ${orderDetails.orderId}
Tracking Number: ${orderDetails.trackingNumber}
Total Cards Processed: ${orderDetails.totalCardsProcessed}

Files have been uploaded to Google Drive:
${driveLink}

Processing Time: ${new Date().toISOString()}
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);
            console.log('Processing notification email sent successfully');
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();