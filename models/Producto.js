'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Producto = Schema({
	idClienteFiscal:Number,
	idProducto:Number,
	fechaAlta:Date,
	clave:String,
	descripcion:String,
	existencia:Number,
	peso:Number,
	stockMaximo:Number,
	stockMinimo:Number,
	statusReg:String
},
{collection:'Productos'}
);

module.exports = mongoose.model('Productos',Producto);