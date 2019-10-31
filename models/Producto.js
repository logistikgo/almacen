'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Helper = require('../helpers');

const Entrada = require('./Entrada');

const Producto = Schema({
	idProducto:Number,
	clave: String,
	usuarioAlta_id : Number,
	usuarioAlta:String,
	fechaAlta:Date,
	fechaUltimaEntrada:Date,
	fechaUltimaEntradaRechazo:Date,
	fechaUltimaSalida:Date,
	fechaUltimaSalidaRechazo:Date,
	fechaBaja:Date,
	clave:String,
	descripcion:String,
	existencia:Number,
	existenciaTarimas:Number,
	existenciaCajas:Number,
	existenciaPesoBruto:Number,
	existenciaPesoNeto:Number,
	pesoBrutoRechazo:Number,
	pesoNetoRechazo:Number,
	peso:Number,
	stockMaximo:Number,
	stockMinimo:Number,
	statusReg:String,
	sucursal_id:{type:Schema.ObjectId, ref:"Sucursal"},
	almacen_id: {type:Schema.ObjectId, ref:"Almacen"},
	clienteFiscal_id: {type:Schema.ObjectId, ref:"ClienteFiscal"},
	presentacion: String,
	presentacion_id: {type:Schema.ObjectId, ref:"Presentacion"},
	valor:Number,
	embalajes:{},
	embalajesAlmacen : {},
	embalajesRechazo:{},
	arrClientesFiscales_id:[	
		{type: Schema.ObjectId, ref: "ClienteFiscal"}
	],

	idClienteFiscal:Number
},
{collection:'Productos'}
);

module.exports = mongoose.model('Producto',Producto);