'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaDXPCosto = Schema(
    {
        //proveedor_id: { type: Schema.ObjectId, ref: 'Proveedor' },
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
        collection: 'TarifasDXPCosto'
    }
);

module.exports = mongoose.model('TarifaDXPCosto', TarifaDXPCosto);