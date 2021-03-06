'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Almacen = require('../controllers/Almacen');
const ClienteFiscal = require('../controllers/ClienteFiscal');
const PlantaProductora = Schema(
	{
		Nombre: String,
		IdAlmacen: { type: Schema.ObjectId, ref: 'Almacen' },
		IdCliente: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
		statusReg: { type: String, default: "ACTIVO" },
		DiasTraslado: Number,
	},
	{
		collection: 'PlantaProductora'
	}
);

module.exports = mongoose.model('PlantaProductora', PlantaProductora);