'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Pasillo = Schema({
	nombre: String,
	almacen_id: {
		type:Schema.ObjectId, 
		ref:'Almacen'
	},
	posiciones: [{
		posicion_id: {
			type: Schema.ObjectId, 
			ref: "Posicion"
		}
	}],
	fechaAlta: Date,
	usuarioAlta_id: Number,
	usuarioAla: String,
	statusReg: String
});

module.exports = mongoose.model('Pasillo', Pasillo);