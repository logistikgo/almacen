'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	producto_id:{type:Schema.ObjectId, ref:"Producto"},
	entrada_id:{type:Schema.ObjectId, ref:"Entrada"},
	salida_id:{type:Schema.ObjectId, ref:"Salida"},
	idCteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	fechaMovimiento:Date,
	cantidad:Number,
	signo:Number,
	tipo:String,
	referencia:String,
	posicion:String,
	nivel:String
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);