async function insert856OutputTables(pool, header, details, measurements, names) {
    // Insert the transformed data into the respective output tables
    try {
        await pool.query('INSERT INTO "856_SNF_Header" VALUES ($1)', [transformedData.header]);
        await pool.query('INSERT INTO "856_SNF_Detail" VALUES ($1)', [transformedData.details]);
        await pool.query('INSERT INTO "856_SNF_Measure" VALUES ($1)', [transformedData.measurements]);
        await pool.query('INSERT INTO "856_SNF_Names" VALUES ($1)', [transformedData.names]);
    } catch (error) {
        console.error('Error inserting into output tables:', error);
    }
}
module.exports = {
    insert856OutputTables
};