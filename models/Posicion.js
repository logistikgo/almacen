'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Posicion = Schema(
	{
		nombre: String,
		niveles: [String],
		estatus: String,
		almacen_id: {
			type:Schema.ObjectId, 
			ref:'Almacen'
		},
		fechaAlta: Date,
		usuario_id: Number,
		statusReg: String
	},
	{
		collection: 'Posiciones'
	}
);

module.exports = mongoose.model('Posicion', Posicion);