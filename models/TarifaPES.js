'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaPES = Schema(
    {
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        tipoCambio: String,
        precioPosicion: Number,
        precioEntrada: Number,
        precioSalida: Number,
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

module.exports = mongoose.model('TarifaPES', TarifaPES);
