'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const backupRepoteSalidas = Schema(
	{
		backupRepoteSalidas_id: Number,
		pedido: String,
		lote:String,
		stringFolio: String,
		item: String,
		clave:String,
		descripcion:String,
		Subclasificacion: String,
		fechaAlta: {
			type: Date,
			default: Date.now
		},
		tarima:Number,
		despacho: Number,
		solicitados: Number,
		infull:Number,
		FechaCargaProgramada: Date,
		fechaSalida: Date,
		horaSello: Date,
		fechaCaducidad:Date,
		retraso:Number,
		onTime:String,
		placasTrailer: String,
		placasRemolque: String,
		ubicacion:String,
		//CAMPOS AUXILIARES
		//partidas : {}
	},
	{
		collection: 'backupRepoteSalidas'
	}
);

module.exports = mongoose.model('backupRepoteSalidas', backupRepoteSalidas);