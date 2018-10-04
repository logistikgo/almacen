'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	producto_id:{type:Schema.ObjectId, ref:"Producto"},
	entrada_id:{type:Schema.ObjectId, ref:"Entrada"},
	salida_id:{type:Schema.ObjectId, ref:"Salida"},
	fechaMovimiento:Date,
	cantidad:Number,
	signo:Number,
	tipo:String,
	referencia:String,
	idClienteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);