'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Almacen = Schema(
	{
		nombre:String,
		idSucursal: Number,
		sucursal_id:{type:Schema.ObjectId,ref:'Sucursal'},
		statusReg:String,
		usuarioAlta: String,
		usuarioAlta_id: Number,
		fechaAlta: Date
	},
	{collection:'Almacenes'}
);

module.exports = mongoose.model('Almacen',Almacen);