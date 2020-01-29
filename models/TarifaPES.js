'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = require('../controllers/ClienteFiscal');

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
    statusReg: { type: String, default: "ACTIVO" }
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

module.exports = mongoose.model('TarifaPES', TarifaPES);
