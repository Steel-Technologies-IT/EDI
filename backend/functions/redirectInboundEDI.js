const fs = require('fs');
const path = require('path');

async function redirectInboundEDI(PO) {
    // Logic to determine the direction based on the file content or metadata
    // For example, you might read the file and look for specific markers
    const Invex_Locations = ['SW', '127', '104', '109', '114', '121'];
    let direction;
    try {
        // Simple logic to determine direction
        if (Invex_Locations.includes(PO)) {
            direction = 'Invex';
        } else {
            direction = 'AS400';
        }
        console.log('System direction:', direction, 'PO Loc:', PO);
    } catch (error) {
        console.error('Error in redirectInboundEDI:', error);
    }
    return direction;
}


module.exports = redirectInboundEDI;
