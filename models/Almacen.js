'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Almacen = Schema(
	{
		nombre:String,
		sucursal_id:{type:Schema.ObjectId,ref:'Sucursal'},
		status:String
		usuarioAlta: String,
		usuarioAlta_id: Number,
		fechaAlta: Date,
	},
	{collection:'Almacenes'}
);

module.exports = mongoose.model('Almacen',Almacen);