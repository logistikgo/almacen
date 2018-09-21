'use strict'

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const Producto = require('./controllers/Producto');
const Usuario = require('./controllers/Usuario');
const CteFiscal = require('./controllers/ClienteFiscal');

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/api/productos', Producto.get);
app.get('/api/productos/:idClienteFiscal',Producto.getByIDClienteFiscal);
app.post('/api/productos',Producto.save);
app.delete('/api/productos/:idProducto',Producto._delete);

app.get('/api/getUsuarios',Usuario.get);
app.get('/api/getUsuario/:idusuario',Usuario.getByIDUsuario);
app.post('/api/saveUsuario',Usuario.save);
app.post('/api/deleteUsuario',Usuario._delete);
app.post('/api/updateUsuario',Usuario.update);

app.get('/api/getCtesFiscales',CteFiscal.get);
app.get('/api/getCteFiscal/:idCteFiscal',CteFiscal.getByIDCteFiscal);
app.post('/api/saveCteFiscal',CteFiscal.save);
app.post('/api/deleteCteFiscal',CteFiscal._delete);
app.post('/api/updateCteFiscal',CteFiscal.update);

module.exports = app;