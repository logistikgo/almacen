'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PrePartida = Schema(
	{
		IDPedido:Number,
		fechaAlta:Date,
		producto_id:{type:Schema.ObjectId,ref:'Producto'},
		clave:String,
		descripcion:String,
		posicion:String,
		posicion_id:{type:Schema.ObjectId,ref:'Posicion'},
		nivel:String,
		lote:String,
		valor:Number,
		pesoBruto:Number,
		pesoNeto:Number,
		embalajes:{},
		isEmpty:Boolean,
		clave_partida:Number,
		isAsignado:Boolean
	},
	{collection:'PrePartidas'}
);

module.exports = mongoose.model('PrePartida',PrePartida);