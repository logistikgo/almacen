'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaFactorCosto = Schema(
    {
        //proveedor_id: { type: Schema.ObjectId, ref: 'Proveedor' },
        embalaje_id: { type: Schema.ObjectId, ref: 'Embalaje' },
        tipoCambio: String,
        factor: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        usuarioBaja_id: Number,
        fechaAlta: { type: Date, default: new Date() },
        fechaBaja: Date,
        statusReg: { type: String, default: "ACTIVO" },
        almacen_id: {type: Schema.ObjectId, ref: 'Almacen'}
    },
    {
        collection: 'TarifasFactorCosto'
    }
);

module.exports = mongoose.model('TarifaFactorCosto', TarifaFactorCosto);