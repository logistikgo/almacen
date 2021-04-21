'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SalidaBabel = Schema(
	{
		//pedido_id: Number,
		almacen_id: {
			type: Schema.ObjectId,
			ref: "Almacen"
		},
		sucursal_id: {
			type: Schema.ObjectId,
			ref: 'Sucursal'
		},
		clienteFiscal_id: {
			type: Schema.ObjectId,
			ref: 'ClienteFiscal'
		},
		referencia: String,
        productosDetalle: [],
		/* 
		folio: String,
		stringFolio: String,
		item: String,
		tipo: String,
		embarco: String,
		referencia: String,
		po: String,
		*/
		fechaAlta: {
			type: Date,
			default: Date.now
		},
	},
	{
		collection: 'SalidasBabel'
	}
);
module.exports = mongoose.model('SalidasBabel', SalidaBabel);
