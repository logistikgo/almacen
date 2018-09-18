'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Usuario = Schema({
	IDUsuario : Number,
	Nombre: String,
	NombreUsuario:String,
	Correo:String,
	TipoUsuario:String,
	StatusReg:String
},
{collection:'Usuarios'}
);

module.exports = mongoose.model('Usuarios',Usuario);