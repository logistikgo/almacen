'use strict'

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const Producto = require('./controllers/Producto');
const Usuario = require('./controllers/Usuario');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.get('/api/productos', Producto.get);
app.get('/api/productos/:idClienteFiscal',Producto.getByIDClienteFiscal);
app.get('/api/usuarios',Usuario.get);
app.get('/api/usuarios/:idusuario',Usuario.getByIDUsuario);

module.exports = app;