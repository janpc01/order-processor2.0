const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { authenticate } = require('@google-cloud/local-auth');
require('dotenv').config();

class DriveService {
    constructor() {
        this.drive = null;
        this.SCOPES = ['https://www.googleapis.com/auth/drive.file'];
        this.FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

        // Validate environment variables
        const requiredEnvVars = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'GOOGLE_PROJECT_ID',
            'GOOGLE_DRIVE_FOLDER_ID'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }
    }

    async init() {
        if (!this.drive) {
            const auth = await authenticate({
                keyfilePath: path.join(__dirname, '../config/credentials.json'),
                scopes: this.SCOPES,
            });
            this.drive = google.drive({ version: 'v3', auth });
        }
    }

    async createOrderZip(orderId, files) {
        const tempDir = path.join(__dirname, '../output/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const zipPath = path.join(tempDir, `${orderId}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);
            archive.pipe(output);

            // Add shipping label
            archive.file(files.shippingLabel, { 
                name: `shipping_label_${orderId}.json` 
            });

            // Create print-sheets directory in zip
            files.printSheets.forEach((filePath, index) => {
                archive.file(filePath, { 
                    name: `print-sheets-${orderId}/print_sheet_${index + 1}_${orderId}.json` 
                });
            });

            archive.finalize();
        });
    }

    async cleanupOutputDirectory() {
        try {
            const outputDir = path.join(__dirname, '../output');
            await fs.rm(outputDir, { recursive: true, force: true });
            console.log('Output directory cleaned successfully');
        } catch (error) {
            console.error('Error cleaning output directory:', error);
            // Don't throw error as this is a cleanup operation
        }
    }

    async uploadToGoogleDrive(zipPath, orderId) {
        await this.init();

        try {
            const fileMetadata = {
                name: `${orderId}.zip`,
                parents: [this.FOLDER_ID]
            };

            const media = {
                mimeType: 'application/zip',
                body: fs.createReadStream(zipPath)
            };

            const file = await this.drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id, webViewLink'
            });

            // Wait for file operations to complete
            await new Promise(resolve => setTimeout(resolve, 1000));

            try {
                // Use fs.promises for promise-based file operations
                const fsPromises = require('fs').promises;
                
                // Delete the zip file
                await fsPromises.unlink(zipPath);
                
                // Delete the output directory
                const outputDir = path.join(__dirname, '../output');
                if (fs.existsSync(outputDir)) {
                    await fsPromises.rm(outputDir, { recursive: true, force: true });
                    console.log('Output directory removed successfully');
                }
            } catch (cleanupError) {
                console.error('Error during cleanup:', cleanupError);
                // Continue even if cleanup fails
            }

            return {
                fileId: file.data.id,
                webViewLink: file.data.webViewLink
            };
        } catch (error) {
            console.error('Error uploading to Google Drive:', error);
            throw error;
        }
    }
}

module.exports = new DriveService();