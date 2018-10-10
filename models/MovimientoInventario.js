'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	producto_id:{type:Schema.ObjectId, ref:"Producto"},
	entrada_id:{type:Schema.ObjectId, ref:"Entrada"},
	salida_id:{type:Schema.ObjectId, ref:"Salida"},
	almacen_id:{type:Schema.ObjectId, ref:"Almacen"},
	idClienteFiscal:Number,
	idSucursal:Number,
	fechaMovimiento:Date,
	cantidad:Number,
	cajas:Number,
	tarimas:Number,
	signo:Number,
	tipo:String,
	referencia:String,
	posicion:String,
	nivel:String,
	idClienteFiscal:Number,
	idSucursal:Number
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);