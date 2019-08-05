'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Pasillo = Schema(
	{
		nombre: String,
		almacen_id: {
			type:Schema.ObjectId, 
			ref:'Almacen'
		},
		posiciones: [{
			posicion_id: {
				type: Schema.ObjectId, 
				ref: "Posicion"
			},
			prioridad: Number
		}],
		prioridad: Number,
		fechaAlta: Date,
		usuarioAlta_id: Number,
		usuarioAlta: String,
		statusReg: String
	},
	{
		collection: 'Pasillos'
	}
);

module.exports = mongoose.model('Pasillo', Pasillo);