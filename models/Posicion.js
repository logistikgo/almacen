'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Posicion = Schema(
	{
		nombre: String,
		niveles: [{
			nombre: String,
			productos: [{
				producto_id:{type:Schema.ObjectId, ref:"Producto"},
				embalajes: {},
				pesoBruto: Number,
				pesoNeto: Number
			}]
		}],
		estatus: String,
		almacen_id: {
			type:Schema.ObjectId, 
			ref:'Almacen'
		},
		fechaAlta: Date,
		usuarioAlta_id: Number,
		usuarioAla: String,
		statusReg: String
	},
	{
		collection: 'Posiciones'
	}
);

module.exports = mongoose.model('Posicion', Posicion);