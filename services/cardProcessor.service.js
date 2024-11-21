const fs = require('fs/promises');
const path = require('path');
const Card = require('../models/card.model');

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
}

module.exports = new CardProcessor();