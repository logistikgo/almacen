'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Sucursal = require('../controllers/Sucursal');

const Almacen = Schema(
	{
		nombre: String,
		sucursal_id: { type: Schema.ObjectId, ref: 'Sucursal' },
		statusReg: { type: String, default: "ACTIVO" },
		usuarioAlta: String,
		usuarioAlta_id: Number,
		fechaAlta: { type: Date, default: Date.now }
	},
	{
		collection: 'Almacenes'
	}
);

var autoPopulateSucursal = function (next) {
	this.populate({
		path: 'sucursal_id',
		select: 'nombre'
	});

	next();
};

Almacen.pre('find', autoPopulateSucursal);
Almacen.post('save', function (doc, next) {
	doc.populate('sucursal_id').execPopulate().then(function () {
		next();
	});
});

module.exports = mongoose.model('Almacen', Almacen);