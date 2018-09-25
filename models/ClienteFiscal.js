'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = Schema({
	idCliente:Number,
	idUsuarioAlta : Number,
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
/*
var model = mongoose.model('ClientesFiscales',Usuario);

async function getNextID(){
	
	return await Helper.getNextID(model,"IDCliente");
}

module.exports = {
	model,
	getNextID
}*/

module.exports = mongoose.model('ClientesFiscales',ClienteFiscal);
