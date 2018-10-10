'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const Entrada = require('./Entrada');

const Producto = Schema({
	idClienteFiscal:Number,
	idProducto:Number,
	usuarioAlta_id : Number,
	nombreUsuario:String,
	fechaAlta:Date,
	fechaUltimaEntrada:Date,
	fechaUltimaSalida:Date,
	fechaBaja:Date,
	clave:String,
	descripcion:String,
	existencia:Number,
	peso:Number,
	stockMaximo:Number,
	stockMinimo:Number,
	statusReg:String,
	idSucursal:Number,
	idAlmacen: Number
},
{collection:'Productos'}
);

// var model = mongoose.model('Productos',Producto);

// function getNextID(){
// 	return Helper.getNextID(model,"idProducto");
// }

// module.exports = {
// 	model,
// 	getNextID
// }


module.exports = mongoose.model('Producto',Producto);