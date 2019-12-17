'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolioIngreso = Schema(
    {
        folio: Number,
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tarifa_id: Schema.ObjectId,
        tipoTarifa: String,
        total: Number,
        fechaInicio: Date,
        fechaFin: Date,
        statusReg: { type: String, default: "ACTIVO" },
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: new Date() }
    },
    {
        collection: 'FoliosIngresos'
    }
);

module.exports = mongoose.model('FolioIngreso', FolioIngreso);