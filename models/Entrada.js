'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Entrada = Schema({
	idEntrada:Number,
	almacen_id:{type:Schema.ObjectId, ref:"Almacen"},
	fechaAlta:Date,
	fechaEntrada:Date,
	folio:String,
	usuarioEntrada:String,
	ordenCompra:String,
	transportista:String,
	remision:String,
	factura:String,
	embarque:String,
	idClienteFiscal:Number,
	idSucursal:Number,
	idAlmacen:Number,
	status: String,
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