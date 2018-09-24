'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Entrada = Schema({
	idEntrada:Number,
	fechaAlta:Date,
	fechaEntrada:Date,
	folio:String,
	usuarioEntrada:String,
	ordenCompra:String,
	transportista:String,
	remision:String,
	factura:String,
	producto:{ type: Schema.ObjectId, ref: "Productos" },
	partidas:[
		{
			producto_id:{ type: Schema.ObjectId, ref: "Productos" },
			piezas:Number,
			tarimas:Number,
			cajas:Number
		}
	]
	// partidas:[
	// 	{
	// 		producto:{ type: Schema.ObjectId, ref: "Productos" },
	// 		piezas:Number,
	// 		tarimas:Number,
	// 		cajas:Number
	// 	}
	// ]
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);