module.exports = {
    // INVEX Web Service Configuration
    invex: {
        // Base URL for your INVEX server
        baseUrl: "https://steeltechnologies.invex.cloud/tststu-TST", // Replace with your actual INVEX server
        authUrl: "https://csisteel.auth.ca-central-1.amazoncognito.com/oauth2/token", // e.g., "https://steeltechnologies.invex.cloud/oauth/token"
        clientId: "4kc416v7i0n007fem46atqbnnf",
        clientSecret:"1e2tko0uos07sv30m3pi4kcqc3s600ibg9nnv8kpe71sk20fu59k",
        // Authentication credentials
        username: "wsedi1",
        password: "wsedi1p",
        applicationId: "EDI810_PROCESSOR",
        // Default company ID for vouchers
        defaultCompanyId: "STX", // Your company code in INVEX
        
        // Timeout settings
        timeout: 30000, // 30 seconds
        
        // Environment-specific settings
        environment: process.env.NODE_ENV || "development"
    },
    
    // Logging configuration
    logging: {
        level: "info", // debug, info, warn, error
        logToFile: true,
        logDirectory: "./logs"
    }
};