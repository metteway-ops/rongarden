require('dotenv').config();
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('<h1>RonGarden er Live!</h1>');
});

app.listen(process.env.PORT || 10000, () => {
    console.log('Online!');
});
