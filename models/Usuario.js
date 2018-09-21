'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const Usuario = Schema({
	IDUsuario : Number,
	Nombre: String,
	NombreUsuario:String,
	Correo:String,
	TipoUsuario:String,
	IsBloqueado : Number,
	StatusReg:String,
	IDUsuarioAlta: Number,
	IDUsuarioEdicion:Number,
	FechaAlta: Date,
	Contrasena : String
},
{collection:'Usuarios'}
);

var model = mongoose.model('Usuarios',Usuario);

async function getNextID(){
	
	return await Helper.getNextID(model,"IDUsuario");
}

module.exports = {
	model,
	getNextID
}
