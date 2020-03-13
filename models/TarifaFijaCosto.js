'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaFijaCosto = Schema(
  {
    //proveedor_id: { type: Schema.ObjectId, ref: 'Proveedor' },
    tipoCambio: String,
    precio: Number,
    periodo: String,
    usuarioAlta: String,
    usuarioAlta_id: Number,
    fechaAlta: { type: Date, default: Date.now },
    usuarioBaja_id: Number,
    fechaBaja: { type: Date },
    statusReg: { type: String, default: "ACTIVO" },
    almacen_id: { type: Schema.ObjectId, ref: 'Almacen' }
  },
  {
    collection: 'TarifasFijaCosto'
  }
);

module.exports = mongoose.model('TarifaFijaCosto', TarifaFijaCosto);