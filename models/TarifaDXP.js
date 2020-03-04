'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = require('../controllers/ClienteFiscal');

const TarifaDXP = Schema(
    {
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tipoCambio: String,
        precioPorDia: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" },
        almacen_id: {type: Schema.ObjectId, ref: 'Almacen'}
    },
    {
        collection: 'TarifasDXP'
    }
);

var autoPopulateCliente = function (next) {
    this.populate({
        path: 'cliente_id',
        select: 'nombreCorto nombreComercial clave'
    });
    next();
};

TarifaDXP.pre('find', autoPopulateCliente);
TarifaDXP.post('save', function (doc, next) {
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
  
  TarifaDXP.pre('find', autoPopulateAlmacen);
  
  TarifaDXP.post('save', function (doc, next) {
    doc.populate('almacen_id').execPopulate()
      .then(function () {
        next();
      });
  });

module.exports = mongoose.model('TarifaDXP', TarifaDXP);