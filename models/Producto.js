'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

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

var model = mongoose.model('Productos',Producto);

function getNextID(){
	return Helper.getNextID(model,"idProducto");
}

module.exports = {
	model,
	getNextID
}