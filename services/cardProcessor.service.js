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

            return randomCards;
        } catch (error) {
            throw new Error(`Failed to fetch random cards: ${error.message}`);
        }
    }

    async generatePrintSheet(mainCard, randomCards) {
        try {
            // Use absolute path and log it
            const baseDir = path.resolve(__dirname, '..');
            const outputDir = path.join(baseDir, 'output', 'print-sheets');
            
            // Create directory synchronously for debugging
            const fs_sync = require('fs');
            if (!fs_sync.existsSync(outputDir)) {
                fs_sync.mkdirSync(outputDir, { recursive: true });
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
            
            // Write file synchronously for debugging
            fs_sync.writeFileSync(filepath, JSON.stringify(printSheet, null, 2));

            return filepath;
        } catch (error) {
            throw error;
        }
    }

    async processCardWithRandoms(cardId) {
        const mainCard = await this.fetchCardInfo(cardId);
        const randomCards = await this.fetchRandomCards(cardId);
        const mainCardFile = await this.generateCardFile(mainCard);
        const randomCardFiles = await Promise.all(
            randomCards.map(card => this.generateCardFile(card))
        );
        const printSheetFile = await this.generatePrintSheet(mainCard, randomCards);
        await this.incrementPrintCount(cardId, 1);

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
    }

    async processOrderWithPrintSheets(orderItems) {
        try {
            const results = [];
            const errors = [];

            // Process each order item sequentially to avoid overwhelming the database
            for (const item of orderItems) {
                try {
                    
                    // Process the card with its random cards for each quantity ordered
                    for (let i = 0; i < item.quantity; i++) {
                        
                        const processResult = await this.processCardWithRandoms(item.card);
                        results.push({
                            cardId: item.card,
                            copy: i + 1,
                            totalCopies: item.quantity,
                            ...processResult
                        });
                    }
                } catch (error) {
                    errors.push({
                        cardId: item.card,
                        error: error.message
                    });
                }
            }

            return {
                success: results,
                failures: errors,
                totalProcessed: results.length,
                totalFailed: errors.length,
                summary: {
                    printSheets: results.map(r => r.printSheet.filepath),
                    totalPrintSheets: results.length
                }
            };
        } catch (error) {
            throw new Error(`Order processing failed: ${error.message}`);
        }
    }

    async incrementPrintCount(cardId, quantity) {
        try {
            const card = await Card.findByIdAndUpdate(
                cardId,
                { $inc: { printCount: quantity } },
                { new: true }
            );
            return card.printCount;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new CardProcessor();