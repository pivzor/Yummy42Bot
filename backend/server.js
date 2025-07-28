const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/frontend', express.static('frontend'));

app.post('/order', (req, res) => {
    console.log('Новый заказ:', req.body);
    res.status(200).send('Заказ получен');
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
