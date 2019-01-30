'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MovimientoInventario = Schema({
	producto_id:{type:Schema.ObjectId, ref:"Producto"},
	clienteFiscal_id:{type:Schema.ObjectId, ref:"ClienteFiscal"},
	entrada_id:{type:Schema.ObjectId, ref:"Entrada"},
	salida_id:{type:Schema.ObjectId, ref:"Salida"},
	almacen_id:{type:Schema.ObjectId, ref:"Almacen"},
	idClienteFiscal:Number,
	idSucursal:Number,
	sucursal_id: {type:Schema.ObjectId, ref:"Sucursal"},
	idSucursal:Number,
	fechaMovimiento:Date,
	cantidad:Number,
	cajas:Number,
	tarimas:Number,
	pesoBruto:Number,
	pesoNeto:Number,
	signo:Number,
	tipo:String,
	referencia:String,
	pasillo: String,
	pasillo_id: {type:Schema.ObjectId, ref:"Pasillo"},
	posicion: String,
	posicion_id:{type:Schema.ObjectId, ref:"Posicion"},
	nivel:String,
	embalajes:{}
	
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);