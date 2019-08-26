'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Entrada = Schema({
	idEntrada:Number,
	almacen_id:{type:Schema.ObjectId, ref:"Almacen"},
	fechaAlta:Date,
	fechaEntrada:Date,
	folio:String,
	stringFolio : String,
	item:String,
	unidad:String,
	usuarioAlta_id:Number,
	nombreUsuario:String,
	usuarioEdita_id:Number,
	ordenCompra:String,
	referencia:String,
	proveedor:String,
	tracto:String,
	remolque:String,
	recibio:String,
	valor:Number,
	transportista:String,
	acuse:String,
	factura:String,
	embarque:String,
	idClienteFiscal:Number,
	idSucursal:Number,
	sucursal_id:{type:Schema.ObjectId,ref:'Sucursal'},
	idAlmacen:Number,
	clienteFiscal_id:{type:Schema.ObjectId,ref:'ClienteFiscal'},
	status: String,
	tipo:String,
	isEmpty: { type: Boolean, default: false },
	salidas_id : [{type:Schema.ObjectId,ref:'Salida'}],
	partidas:[{type:Schema.ObjectId,ref:'Partida'}],
	//ATRIBUTOS AUXILIARES
	// done: Boolean,
	// donepartida: Boolean,
	// partidasH : {},
	// partidasI : {},
	// cantPartidas : Number,
	// cantSalidas : Number,
	// partidasSalida: {},
	// partidas : {}
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);