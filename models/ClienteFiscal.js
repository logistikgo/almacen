'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = Schema({
	idCliente:Number,
	usuarioAlta_id : Number,
	nombreUsuario : String,
	idSucursal : Number,
	fechaAlta:Date,
	fechaElimina:Date,
	fechaEdita:Date,
	nombreCorto:String,
	nombreComercial:String,
	razonSocial:String,
	rfc : String,
	calle:String,
	numExt:String,
	numInt:String,
	cp:Number,
	colonia:String,
	municipio:String,
	estado:String,
	pais:String,
	statusReg:String	
},
{collection:'ClientesFiscales'}
);

module.exports = mongoose.model('ClientesFiscales',ClienteFiscal);
