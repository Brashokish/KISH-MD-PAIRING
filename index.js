const express = require('express');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;
const code = require('./pair');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/code', code);
app.use('/pair', (req, res) => res.sendFile(`${__dirname}/pair.html`));
app.use('/', (req, res) => res.sendFile(`${__dirname}/main.html`));

module.exports = app;
