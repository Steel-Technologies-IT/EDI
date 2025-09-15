const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

// GET /api/listFiles?path=...
router.get("/listFiles", async (req, res) => {
    const dirPath = req.query.path;
    if (!dirPath) {
        return res.status(400).json({ error: "Missing path parameter" });
    }

    // Security: Only allow specific base directories
    const allowedBases = [
        "\\\\sttxcleoharmd02\\payload\\PERN",
        "\\\\az-cld-ivap-q1\\inboundSNF",
        "\\\\az-cld-ivap-q1\\JSONS",
        "\\\\sttxcleoharmd02\\payload\\Invex\\JSON\\Inbound",
    ];
    if (!allowedBases.some(base => dirPath.startsWith(base))) {
        return res.status(403).json({ error: "Access to this path is not allowed" });
    }

    fs.readdir(dirPath, { withFileTypes: true }, (err, entries) => {
        if (err) {
            return res.status(500).json({ error: "Unable to read directory", details: err.message });
        }
        // Only files, not directories
        const files = entries
            .filter(entry => entry.isFile())
            .map(entry => entry.name);
        res.json(files);
    });
});

module.exports = router;