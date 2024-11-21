const fs = require('fs/promises');
const path = require('path');
const Card = require('../models/card.model');
const mongoose = require('mongoose');

class CardProcessor {
    async fetchCardInfo(cardId) {
        try {
            const card = await Card.findById(cardId);
            if (!card) {
                throw new Error(`Card not found: ${cardId}`);
            }
            return card;
        } catch (error) {
            console.error('Error fetching card:', error);
            throw error;
        }
    }

    async generateCardFile(card) {
        try {
            // For now, let's just create a simple JSON file as a placeholder
            const outputDir = path.join(__dirname, '../output/cards');
            await fs.mkdir(outputDir, { recursive: true });
            
            const filename = `card_${card._id}.json`;
            const filepath = path.join(outputDir, filename);
            
            await fs.writeFile(
                filepath, 
                JSON.stringify(card, null, 2)
            );

            return filepath;
        } catch (error) {
            console.error('Error generating card file:', error);
            throw error;
        }
    }

    async fetchRandomCards(excludeCardId, count = 19) {
        try {
            const excludeId = typeof excludeCardId === 'string' 
                ? new mongoose.Types.ObjectId(excludeCardId) 
                : excludeCardId;

            // First, get total count of available cards (excluding the main card)
            const availableCount = await Card.countDocuments({ _id: { $ne: excludeId } });
            
            // Adjust requested count if we don't have enough cards
            const adjustedCount = Math.min(count, availableCount);
            
            const randomCards = await Card.aggregate([
                { $match: { _id: { $ne: excludeId } } },
                { $sample: { size: adjustedCount } }
            ]);

            console.log(`Found ${randomCards.length} random cards out of ${availableCount} available cards`);
            return randomCards;
        } catch (error) {
            console.error('Error fetching random cards:', error);
            throw new Error(`Failed to fetch random cards: ${error.message}`);
        }
    }

    async generatePrintSheet(mainCard, randomCards) {
        try {
            // Use absolute path and log it
            const baseDir = path.resolve(__dirname, '..');
            const outputDir = path.join(baseDir, 'output', 'print-sheets');
            
            console.log('Base directory:', baseDir);
            console.log('Attempting to create directory:', outputDir);
            
            // Create directory synchronously for debugging
            const fs_sync = require('fs');
            if (!fs_sync.existsSync(outputDir)) {
                fs_sync.mkdirSync(outputDir, { recursive: true });
                console.log('Directory created');
            } else {
                console.log('Directory already exists');
            }
            
            const printSheet = {
                mainCard: mainCard,
                randomCards: randomCards,
                totalCards: 1 + randomCards.length,
                maxPossibleCards: 20,
                actualCards: 1 + randomCards.length,
                generatedAt: new Date().toISOString()
            };

            const filename = `print_sheet_${mainCard._id}_${Date.now()}.json`;
            const filepath = path.join(outputDir, filename);
            console.log('Writing file to:', filepath);
            
            // Write file synchronously for debugging
            fs_sync.writeFileSync(filepath, JSON.stringify(printSheet, null, 2));
            console.log('File written successfully');

            return filepath;
        } catch (error) {
            console.error('Error in generatePrintSheet:', error);
            console.error('Error stack:', error.stack);
            throw error;
        }
    }

    async processCardWithRandoms(cardId) {
        try {
            console.log('Starting processCardWithRandoms for cardId:', cardId);
            
            const mainCard = await this.fetchCardInfo(cardId);
            console.log('Main card fetched');
            
            const randomCards = await this.fetchRandomCards(cardId);
            console.log('Random cards fetched:', randomCards.length);

            // Generate individual card files
            const mainCardFile = await this.generateCardFile(mainCard);
            console.log('Main card file generated:', mainCardFile);
            
            const randomCardFiles = await Promise.all(
                randomCards.map(card => this.generateCardFile(card))
            );
            console.log('Random card files generated');

            // Generate print sheet
            console.log('Attempting to generate print sheet...');
            const printSheetFile = await this.generatePrintSheet(mainCard, randomCards);
            console.log('Print sheet generated:', printSheetFile);

            return {
                mainCard: {
                    card: mainCard,
                    filepath: mainCardFile
                },
                randomCards: randomCards.map((card, index) => ({
                    card: card,
                    filepath: randomCardFiles[index]
                })),
                printSheet: {
                    filepath: printSheetFile,
                    totalCards: 1 + randomCards.length,
                    maxPossibleCards: 20
                }
            };
        } catch (error) {
            console.error('Error in processCardWithRandoms:', error);
            throw new Error(`Failed to process card with randoms: ${error.message}`);
        }
    }
}

module.exports = new CardProcessor();