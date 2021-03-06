'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Embalaje = Schema({
	clave: String,
	nombre: String,
	descripcion: String,
	fechaAlta: Date,
	fechaEdita: Date,
	usuarioAlta_id: Number,
	usuarioAlta: String,
	usuarioEdita_id: Number,
	status: String
},
	{
		collection: 'Embalajes'
	}
);

module.exports = mongoose.model('Embalaje', Embalaje);