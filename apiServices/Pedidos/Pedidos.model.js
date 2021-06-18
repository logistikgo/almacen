'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema(
	{
		salida_id: Number,
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
		folio: String,
		stringFolio: String,
		referencia:String,
		partidas: [
			{
				type: Schema.ObjectId,
				ref: 'Partida'
			}
		],
		fechaAlta: {
			type: Date,
			default: Date.now
		},
		usuarioSalida_id: Number,
		usuarioAlta_id: Number,
		nombreUsuario: String
	},
	{
		collection: 'Salidas'
	}
);

module.exports = mongoose.model('Salida', Salida);