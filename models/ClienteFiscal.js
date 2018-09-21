'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const ClienteFiscal = Schema({
	IDCliente:Number,
	IDUsuarioAlta : Number,
	IDSucursal : Number,
	FechaAlta:Date,
	FechaElimina:Date,
	FechaEdita:Date,
	NombreCorto:String,
	NombreComercial:String,
	RazonSocial:String,
	RFC : String,
	Calle:String,
	NumExt:String,
	NumInt:String,
	CP:Number,
	Colonia:String,
	Municipio:String,
	Estado:String,
	Pais:String,
	StatusReg:String	
},
{collection:'ClientesFiscales'}
);

var model = mongoose.model('ClientesFiscales',Usuario);

async function getNextID(){
	
	return await Helper.getNextID(model,"IDCliente");
}

module.exports = {
	model,
	getNextID
}
