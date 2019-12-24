'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = Schema({
	idCliente: Number,
	usuarioAlta_id: Number,
	usuarioEdita_id: Number,
	nombreUsuario: String,
	idSucursal: Number,
	sucursal_id: { type: Schema.ObjectId, ref: 'Sucursal' },
	fechaAlta: Date,
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
	tipoTarifaPrecio: String,
	statusReg: String,
	hasTarifa: Boolean
},
	{ collection: 'ClientesFiscales' }
);

module.exports = mongoose.model('ClienteFiscal', ClienteFiscal);
