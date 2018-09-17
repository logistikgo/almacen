'use strict'

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const Producto = require('./controllers/Producto');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.get('/api/productos', Producto.get);
app.get('/api/productos/:idClienteFiscal',Producto.getByIDClienteFiscal);

module.exports = app;