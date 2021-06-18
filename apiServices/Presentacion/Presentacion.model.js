'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Presentacion = Schema({
	nombre: String,
	descripcion: String,
	usuarioAlta: String,
	usuarioAlta_id: Number,
	fechaAlta: Date,
	statusReg: String
}, {
	collection:'Presentaciones'
});

module.exports = mongoose.model('Presentacion', Presentacion);