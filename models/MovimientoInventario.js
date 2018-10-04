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
<<<<<<< HEAD
	posicion:String,
	nivel:String
=======
	idClienteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number
>>>>>>> 9706afeab67c8df79b4476fe4960805d6ff13b79
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);