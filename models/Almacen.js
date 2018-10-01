'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Almacen = Schema(
	{
		idAlmacen:Number,
		nombre:String,
		idSucursal:Number,
		status:String
	},
	{collection:'Almacenes'}
);

module.exports = mongoose.model('Almacenes',Almacen);