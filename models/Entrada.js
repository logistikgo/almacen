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
	embarque:String,
	idCteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	partidas:[
		{
			producto_id:{ type: Schema.ObjectId, ref: "Producto" },
			piezas:Number,
			tarimas:Number,
			cajas:Number,
			posicion: String,
			nivel:String
		}
	]
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);