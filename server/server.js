const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// API: G-Code generation (placeholder)
app.post('/api/generate', (req, res) => {
  const { blank, operations } = req.body;
  // G-Code generation logic will go here
  res.json({ gcode: '(ncWOP G-Code placeholder)', status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`ncWOP running on port ${PORT}`);
});
