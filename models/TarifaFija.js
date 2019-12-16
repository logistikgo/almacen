'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaFija = Schema(
    {
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tipoCambio: String,
        precio: Number,
        periodo: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" }
    },
    {
        collection: 'TarifasFija'
    }
);

module.exports = mongoose.model('TarifaFija', TarifaFija);