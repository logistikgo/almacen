'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema({
	salida_id:Number,
	usuarioSalida_id:Number,
	idClienteFiscal:Number,
	idSucursal:Number,
	sucursal_id:{type:Schema.ObjectId,ref:'Sucursal'},
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
	clienteFiscal_id:{type:Schema.ObjectId,ref:'ClienteFiscal'},
	idSucursal:Number,
	idAlmacen:Number,
	valor: Number,
	item: String,
	tipo:String,
	entrada_id:{type:Schema.ObjectId,ref:"Entrada"},
	partidas:[
		{
			IDPedido : Number,
			InfoPedido : {},
			producto_id:{type:Schema.ObjectId, ref:"Producto"},
			clave:String,
			descripcion:String,
			pasillo: String,
			pasillo_id: {type:Schema.ObjectId, ref:"Pasillo"},
			posicion:String,
			posicion_id:{type:Schema.ObjectId, ref:"Posicion"},
			nivel:String,
			lote:String,
			valor:Number,
			pesoBruto:Number,
			pesoNeto:Number,
			embalajes:{},
			clave_partida: String
		}
	]
},{collection:'Salidas'});

module.exports = mongoose.model('Salida',Salida);