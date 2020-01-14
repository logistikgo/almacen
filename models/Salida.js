'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema({
	salida_id: Number,
	almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	sucursal_id: { type: Schema.ObjectId, ref: 'Sucursal' },
	clienteFiscal_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
	folio: String,
	stringFolio: String,
	item: String,
	tipo: String,
	embarco: String,
	referencia: String,
	transportista: String,
	placasTrailer: String,
	placasRemolque: String,
	operador: String,
	entrada_id: [{ type: Schema.ObjectId, ref: "Entrada" }],
	fechaSalida: Date,
	tiempoCarga_id: { type: Schema.ObjectId, ref: "TiempoCargaDescarga" },
	valor: Number,
	partidas: [{ type: Schema.ObjectId, ref: 'Partida' }],
	usuarioSalida_id: Number,
	fechaAlta: { type: Date, default: Date.now },
	usuarioAlta_id: Number,
	nombreUsuario: String,
	//DEPURAR LOS SIGUIENTES CAMPOS (AUN SE USAN?)
	cliente: String,
	idClienteFiscal: Number,
	idSucursal: Number,
	idSucursal: Number,
	//CAMPOS AUXILIARES
	//partidas : {}
}, { collection: 'Salidas' });

module.exports = mongoose.model('Salida', Salida);