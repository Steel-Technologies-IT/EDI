const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Import other routes (add your route files here)
// const exampleRoutes = require('./routes/example');
// app.use('/api/example', exampleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});


app.use(express.static(path.join(__dirname, './build')));
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, './build', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server is running on port ${PORT}`);
  console.log(process.env.REACT_APP_HOST);
  console.log(process.env.REACT_APP_Entra_ClientId);
  console.log(process.env.REACT_APP_Entra_Authority);
  console.log(process.env.REACT_APP_REDIRECT_URI);
});
