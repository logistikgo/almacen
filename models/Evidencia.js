'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Evidencia = Schema(
	{
		nombreArchivo:String,
		rutaArchivo:String,
		tipo:String,
		tipoTarifa:String,
		idEvidencia: String,
		tarifa_id:{type:Schema.ObjectId},
		entrada_id:{type:Schema.ObjectId,ref:'Entrada'},
		salida_id:{type:Schema.ObjectId,ref:'Salida'},
		fechaAlta:Date,
		usuario_id:Number,
		usuarioNombre:String,
		statusReg:String
	},
	{collection:'Evidencias'}
);

module.exports = mongoose.model('Evidencia',Evidencia);