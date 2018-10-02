'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Usuario = Schema({
	idUsuario : Number,
	nombre: String,
	nombreUsuario:String,
	correo:String,
	tipoUsuario:String,
	isBloqueado : Number,
	statusReg:String,
	idUsuarioAlta: Number,
	idUsuarioEdicion:Number,
	fechaAlta: Date,
	contrasena : String
},
{collection:'Usuarios'}
);

module.exports = mongoose.model('Usuarios',Usuario);
