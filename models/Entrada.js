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
	partidas:[
	/*
		{
			producto_id:{ type: Schema.ObjectId, ref: "Producto" },
			piezas:Number,
			tarimas:Number,
			cajas:Number,
			pesoBruto:Number,
			pesoNeto:Number,
			lote:String,
			posicion: String,
			nivel:String,
			valor:Number,
			embalajes:[]
		}*/
	]
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);