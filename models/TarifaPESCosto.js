'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TarifaPESCosto = Schema (
    {
        //proveedor_id: { type: Schema.ObjectId, ref: 'Proveedor' },
        tipoCambio: String,
        precioPosicion: Number,
        precioEntrada: Number,
        precioSalida: Number,
        almacen_id: {type: Schema.ObjectId, ref: 'Almacen'},
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" },
    },
    {
        collection: 'TarifasPESCosto'
    }
)

module.exports = mongoose.model('TarifaPESCosto', TarifaPESCosto);