'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Salida = Schema(
	{
		salida_id: Number,
		almacen_id: {
			type: Schema.ObjectId,
			ref: "Almacen"
		},
		sucursal_id: {
			type: Schema.ObjectId,
			ref: 'Sucursal'
		},
		clienteFiscal_id: {
			type: Schema.ObjectId,
			ref: 'ClienteFiscal'
		},
		folio: String,
		stringFolio: String,
		item: String,
		tipo: String,
		embarco: String,
		referencia: String,
		po: String,
		numeroOrden: String,
		numeroRastreo: String,
		destinatario: String,
		transportista: String,
		operador: String,
		tipoUnidad: String,
		placasTrailer: String,
		placasRemolque: String,
		sello: String,
		horaSello: Date,
		tiempoCarga_id: {
			type: Schema.ObjectId,
			ref: "TiempoCargaDescarga"
		},
		fechaSalida: Date,
		entrada_id: [
			{
				type: Schema.ObjectId,
				ref: "Entrada"
			}
		],
		partidas: [
			{
				type: Schema.ObjectId,
				ref: 'Partida'
			}
		],
		fechaAlta: {
			type: Date,
			default: Date.now
		},
		usuarioSalida_id: Number,
		usuarioAlta_id: Number,
		nombreUsuario: String,
		//DEPURAR LOS SIGUIENTES CAMPOS (AUN SE USAN?)
		valor: Number,
		cliente: String,
		idClienteFiscal: Number,
		idSucursal: Number,
		idSucursal: Number,
		//CAMPOS AUXILIARES
		//partidas : {}
	},
	{
		collection: 'Salidas'
	}
);

module.exports = mongoose.model('Salida', Salida);