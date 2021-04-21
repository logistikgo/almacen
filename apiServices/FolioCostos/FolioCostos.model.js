'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolioCostos = Schema(
    {
        folio: String,
        proveedor_id: Number,
        proveedorRfc: String,
        tarifa_id: Schema.ObjectId,
        tipoTarifa: String,
        total: Number,
        Moneda: String,
        iva: Number,
        subtotal: Number,
        retencion: Number,
        fechaInicio: Date,
        fechaFin: Date,
        statusReg: { type: String, default: "ACTIVO" },
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: new Date() }
    },
    {
        collection: 'FolioCostos'
    }
);

module.exports = mongoose.model('FolioCostos', FolioCostos);