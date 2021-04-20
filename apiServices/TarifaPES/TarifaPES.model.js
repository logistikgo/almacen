'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.controller');

const TarifaPES = Schema(
  {
    cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
    tipoCambio: String,
    precioPosicion: Number,
    precioEntrada: Number,
    precioSalida: Number,
    usuarioAlta: String,
    usuarioAlta_id: Number,
    usuarioBaja_id: Number,
    fechaAlta: { type: Date, default: new Date() },
    fechaBaja: Date,
    statusReg: { type: String, default: "ACTIVO" },
    almacen_id: { type: Schema.ObjectId, ref: 'Almacen' }
  },
  {
    collection: 'TarifasPES'
  }
);

var autoPopulateCliente = function (next) {
  this.populate({
    path: 'cliente_id',
    select: 'nombreCorto nombreComercial clave'
  });
  next();
};

TarifaPES.pre('find', autoPopulateCliente);

TarifaPES.post('save', function (doc, next) {
  doc.populate('cliente_id').execPopulate()
    .then(function () {
      ClienteFiscal.setHasTarifa(doc.cliente_id);
      next();
    });
});

var autoPopulateAlmacen = function (next) {
  this.populate({
    path: 'almacen_id',
    select: 'nombre'
  });
  next();
};

TarifaPES.pre('find', autoPopulateAlmacen);

TarifaPES.post('save', function (doc, next) {
  doc.populate('almacen_id').execPopulate()
    .then(function () {
      next();
    });
});

module.exports = mongoose.model('TarifaPES', TarifaPES);
