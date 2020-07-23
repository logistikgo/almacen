'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = require('../controllers/ClienteFiscal');

const TarifaFija = Schema(
  {
    nombre: String,
    cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
    tipoCambio: String,
    precio: Number,
    periodo: String,
    cantidad:Number,
    usuarioAlta: String,
    usuarioAlta_id: Number,
    fechaAlta: { type: Date, default: Date.now },
    usuarioBaja_id: Number,
    fechaBaja: { type: Date },
    statusReg: { type: String, default: "ACTIVO" },
    almacen_id: { type: Schema.ObjectId, ref: 'Almacen' },
    tipo: { type: String, default: "NORMAL" },
    tipoExcedente: { type: String, default: "NONE" },
  },
  {
    collection: 'TarifasFija'
  }
);

var autoPopulateCliente = function (next) {
  this.populate({
    path: 'cliente_id',
    select: 'nombreCorto nombreComercial clave'
  });
  next();
};

TarifaFija.pre('find', autoPopulateCliente);
TarifaFija.post('save', function (doc, next) {
  doc.populate('cliente_id').execPopulate().then(function () {
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

TarifaFija.pre('find', autoPopulateAlmacen);

TarifaFija.post('save', function (doc, next) {
  doc.populate('almacen_id').execPopulate()
    .then(function () {
      next();
    });
});

module.exports = mongoose.model('TarifaFija', TarifaFija);