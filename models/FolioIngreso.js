'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolioIngreso = Schema(
    {
        folio: String,
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tarifa_id: Schema.ObjectId,
        tipoTarifa: String,
        total: Number,
        fechaInicio: Date,
        fechaFin: { type: Date, default: new Date() },
        statusReg: { type: String, default: "ACTIVO" },
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: Date
    },
    {
        collection: 'FoliosIngreso'
    }
);

module.exports = mongoose.model('FolioIngreso', FolioIngreso);