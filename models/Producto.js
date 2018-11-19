'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const Entrada = require('./Entrada');

const Producto = Schema({
	idClienteFiscal:Number,
	idProducto:Number,
	usuarioAlta_id : Number,
	nombreUsuario:String,
	fechaAlta:Date,
	fechaUltimaEntrada:Date,
	fechaUltimaSalida:Date,
	fechaBaja:Date,
	clave:String,
	descripcion:String,
	existencia:Number,
	existenciaTarimas:Number,
	existenciaCajas:Number,
	existenciaPesoBruto:Number,
	existenciaPesoNeto:Number,
	peso:Number,
	stockMaximo:Number,
	stockMinimo:Number,
	statusReg:String,
	idSucursal:Number,
	almacen_id: {type:Schema.ObjectId, ref:"Almacen"},
	presentacion: String,
	valor:Number,
	embalajes:{},
	arrClientesFiscales_id:[	
		{type: Schema.ObjectId, ref: "ClienteFiscal"}
	]
},
{collection:'Productos'}
);

module.exports = mongoose.model('Producto',Producto);