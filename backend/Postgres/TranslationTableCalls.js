const express = require("express");
const app = express.Router();
const pool = require("../db2");

//Post New Translation Rule
app.post("/Path/:name", async(req, res) => {
    try {
        
        const { name } = req.params
        const { path_role } = req.body;
        
        const AddRole = await pool.query("UPDATE pathaccess SET path_roles = array_append(path_roles, $2) WHERE path_name = $1", [name, path_role])

        res.json("Role Added")
    } catch (err) {
        console.error(err.message)
    }
})

module.exports = app;