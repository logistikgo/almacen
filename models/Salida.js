'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema({
	salida_id:Number,
	fechaAlta:Date,
	fechaSalida:Date,
	folio:String,
	usuarioSalida_id:Number,
	referencia:String,
	cliente:String,
	transportista:String,
	idCteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	partidas:[
		{
			producto_id:{type:Schema.ObjectId, ref:"Producto"},
			piezas:Number,
			tarimas:Number,
			cajas:Number
		}
	]
},{collection:'Salidas'});

module.exports = mongoose.model('Salida',Salida);