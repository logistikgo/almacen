'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaDXP = Schema(
    {
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tipoCambio: String,
        precioPorDia: Number,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" }
    },
    {
        collection: 'TarifasDXP'
    }
);

module.exports = mongoose.model('TarifaDXP', TarifaDXP);