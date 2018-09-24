'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const Entrada = require('./Entrada');

const Producto = Schema({
	idClienteFiscal:Number,
	idProducto:Number,
	fechaAlta:Date,
	fechaBaja:Date,
	clave:String,
	descripcion:String,
	existencia:Number,
	peso:Number,
	stockMaximo:Number,
	stockMinimo:Number,
	statusReg:String,
	movimientosInventario:[
		{
			Entrada_id:{type:Schema.ObjectId, ref:"Entrada"},
			folio:Number,
			fechaMovimiento:Number,
			signo:Number,
			cantidad:Number,
			tarimas:Number,
			piezas:Number,
		}
	]
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


module.exports = mongoose.model('Productos',Producto);