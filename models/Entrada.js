'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Entrada = Schema({
	idEntrada:Number,
	almacen_id:{type:Schema.ObjectId, ref:"Almacen"},
	fechaAlta:Date,
	fechaEntrada:Date,
	folio:String,
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
	partidas:[
		{
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
			clave_partida: String,
			IDPedido : Number
		}
	],
	partidasSalida:[
		{
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
			isEmpty:{ type: Boolean, default: false },
			clave_partida: String,
			IDPedido : Number
		}
	]
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);