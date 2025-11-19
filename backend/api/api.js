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