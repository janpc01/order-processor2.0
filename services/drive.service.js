const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const { authenticate } = require('@google-cloud/local-auth');

class DriveService {
    constructor() {
        this.drive = null;
        this.SCOPES = ['https://www.googleapis.com/auth/drive.file'];
        this.FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID; // The ID of your designated folder
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

            // Clean up temp zip file
            fs.unlink(zipPath, err => {
                if (err) console.error('Error cleaning up zip file:', err);
            });

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