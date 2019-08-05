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
	posiciones: [
		{
			embalajesEntrada: {},
			embalajesxSalir: {},
			posicion_id: {type:Schema.ObjectId,ref:'Posicion'},
			posicion: String,
			pasillo_id : {type:Schema.ObjectId,ref:'Pasillo'},
			pasillo:String,
			nivel_id: {type:Schema.ObjectId},
			nivel:String
		}
	],
	embalajes:{},
	clave_partida: String
},
{collection:"MovimientosInventario"});

module.exports = mongoose.model("MovimientoInventario", MovimientoInventario);