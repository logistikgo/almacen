'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema({
	salida_id:Number,
	usuarioSalida_id:Number,
	idCteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	fechaAlta:Date,
	fechaSalida:Date,
	folio:String,
	referencia:String,
	cliente:String,
	transportista:String,
<<<<<<< HEAD
	placasRemolque:String,
	placasTrailer:String,
	operador:String,
=======
	idClienteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
>>>>>>> 9706afeab67c8df79b4476fe4960805d6ff13b79
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