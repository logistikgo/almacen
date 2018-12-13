'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Almacen = Schema(
	{
		idAlmacen:Number,
		nombre:String,
		cp:Number,
		colonia:String,
		calle:String,
		numExt:String,
		numInt:String,
		idSucursal:Number,
		sucursal_id:{type:Schema.ObjectId,ref:'Sucursal'},
		status:String
	},
	{collection:'Almacenes'}
);

module.exports = mongoose.model('Almacen',Almacen);