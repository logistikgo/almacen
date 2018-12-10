'use strict'

const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const Helper = require('./helpers');
const Producto = require('./controllers/Producto');
const Usuario = require('./controllers/Usuario');
const Entrada = require('./controllers/Entrada');
const CteFiscal = require('./controllers/ClienteFiscal');
const MovimientosInventario = require('./controllers/MovimientoInventario');
const Salida = require('./controllers/Salida');
const Sucursal = require("./controllers/Sucursal");
const Almacen = require('./controllers/Almacen');
const Evidencia = require('./controllers/Evidencia');
const Posicion = require('./controllers/Posicion');
const Embalaje = require('./controllers/Embalaje');

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//app.post('/api/formatEmbalajes',Helper.formatEmbalajes);
//app.post('/api/formatItems',Helper.FormatItems);

app.get('/api/productos', Producto.get);
app.get('/api/productos/:idClienteFiscal', Producto.getByIDClienteFiscal);
app.post('/api/producto', Producto.save);
app.delete('/api/productos/:idProducto', Producto._delete);
app.get('/api/validaProducto/:clave',Producto.validaProducto);
app.get('/api/getProductos',Producto.getByIDsClientesFiscales);

app.get('/api/movimientosInventario/:producto_id', MovimientosInventario.getByProducto);
app.get ('/api/posicionesxProducto/:producto_id', MovimientosInventario.getPosicionesByProducto);
app.get('/api/movimientosInventario', MovimientosInventario.get);
app.get('/api/movimientosInventarioByIDs/:idClienteFiscal/:idSucursal/:idAlmacen', MovimientosInventario.getByIDs_cte_suc_alm);
app.get('/api/movimientosInventarioByCtes', MovimientosInventario.getByIDs_ctes_suc_alm);

app.get('/api/getUsuarios', Usuario.get);
app.get('/api/getUsuario/:idusuario', Usuario.getByIDUsuario);
app.post('/api/saveUsuario', Usuario.save);
app.post('/api/deleteUsuario', Usuario._delete);
app.post('/api/updateUsuario', Usuario.update);

app.get('/api/entradas', Entrada.get);
app.get('/api/entradaByID/:idEntrada', Entrada.getEntradaByID);
app.get('/api/getEntradasByIDs/:idClienteFiscal/:idSucursal/:idAlmacen',Entrada.getEntradasByIDs);
app.get('/api/partidasByIDs',Helper.getPartidasByIDs);
app.post('/api/entrada', Entrada.save);
app.post('/api/validaEntrada',Entrada.validaEntrada);

app.get('/api/salidas', Salida.get);
app.get('/api/salidaByID/:salida_id', Salida.getByID);
app.get('/api/getSalidasByIDs/:idClienteFiscal/:idSucursal/:idAlmacen',Salida.getSalidasByIDs);
app.post('/api/salida', Salida.save);

app.get('/api/getCtesFiscales', CteFiscal.get);
app.get('/api/getCteFiscal/:idCteFiscal', CteFiscal.getByIDCteFiscal);
app.post('/api/saveCteFiscal', CteFiscal.save);
app.post('/api/deleteCteFiscal', CteFiscal._delete);
app.post('/api/updateCteFiscal', CteFiscal.update);

app.get('/api/sucursales', Sucursal.get);
app.get('/api/sucursal', Sucursal.getById);
app.post('/api/sucursal', Sucursal.save);
app.put('/api/sucursal', Sucursal.update);
app.delete('/api/sucursal', Sucursal._delete);

app.get('/api/getAlmacenes',Almacen.getAlmacenes);
app.get('/api/getAlmacen/:idAlmacen',Almacen.getAlmacen);
app.get('/api/almacen', Almacen.getById);
app.get('/api/getAlmacenes/:idSucursal',Almacen.getAlmacenesByIDSucursal);
app.post('/api/saveAlmacen',Almacen.saveAlmacen);
app.post('/api/updateAlmacen',Almacen.updateAlmacen);
app.post('/api/deleteAlmacen',Almacen.deleteAlmacen);
app.get('/api/validaPosicion/:posicion/:nivel/:almacen_id', Almacen.validaPosicion);
app.get('/api/ubicaciones/:almacen_id/:idClienteFiscal/:idSucursal',Almacen.getUbicaciones);

app.post('/api/evidencia',Evidencia.saveEvidencia);
app.get('/api/evidencias',Evidencia.getEvidenciasByID);

app.get('/api/posiciones', Posicion.get);
app.get('/api/posicion', Posicion.getById);
app.put('/api/posicion', Posicion.update);
app.delete('/api/posicion', Posicion._delete);

app.get('/api/embalajes',Embalaje.getEmbalajes);
app.post('/api/embalaje',Embalaje.saveEmbalaje);

module.exports = app;