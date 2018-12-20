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
	idSucursal:Number,
	sucursal_id:{type:Schema.ObjectId, ref:"Sucursal"},
	almacen_id: {type:Schema.ObjectId, ref:"Almacen"},
	presentacion: String,
	presentacion_id: {type:Schema.ObjectId, ref:"Presentacion"},
	valor:Number,
	embalajes:{},
	embalajesRechazo:{},
	arrClientesFiscales_id:[	
		{type: Schema.ObjectId, ref: "ClienteFiscal"}
	]
},
{collection:'Productos'}
);

module.exports = mongoose.model('Producto',Producto);