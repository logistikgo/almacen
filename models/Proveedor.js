'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Proveedor = Schema({
	idProveedor: Number,
	usuarioAlta_id: Number,
	usuarioEdita_id: Number,
	nombreUsuario: String,
	fechaAlta: {type: String, default: new Date() },
	fechaElimina: Date,
	fechaEdita: Date,
	nombreCorto: String,
	nombreComercial: String,
	razonSocial: String,
	clave: String,
	rfc: String,
	calle: String,
	numExt: String,
	numInt: String,
	cp: Number,
	colonia: String,
	municipio: String,
	estado: String,
	pais: String,	
	statusReg: { type: String, default: 'ACTIVO' } ,
	hasTarifa:{ type: Boolean, default: false } 
},
	{ collection: 'Proveedor' }
);

module.exports = mongoose.model('Proveedor', Proveedor);
