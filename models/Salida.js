'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema({
	salida_id:Number,
	usuarioSalida_id:Number,
	idClienteFiscal:Number,
	idSucursal:Number,
	almacen_id: {type:Schema.ObjectId, ref:"Almacen"},
	fechaAlta:Date,
	fechaSalida:Date,
	usuarioAlta_id:Number,
	nombreUsuario:String,
	folio:String,
	referencia:String,
	cliente:String,
	transportista:String,
	placasRemolque:String,
	placasTrailer:String,
	embarco:String,
	operador:String,
	idClienteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	partidas:[
		{
			producto_id:{type:Schema.ObjectId, ref:"Producto"},
			piezas:Number,
			tarimas:Number,
			cajas:Number,
			pesoBruto:Number,
			pesoNeto:Number,
			lote:String
		}
	]
},{collection:'Salidas'});

module.exports = mongoose.model('Salida',Salida);