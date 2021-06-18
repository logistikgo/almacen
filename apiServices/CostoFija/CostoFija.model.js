'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CostoFija = Schema(
    {
        proveedor_id: {
            type: Schema.ObjectId
            //ref: 'ClienteFiscal' 
        },
        almacen_id: {
            type: Schema.ObjectId,
            ref: 'Almacen'
        },
        tipoCambio: String,
        precio: Number,
        periodo: String,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" },
    },
    {
        collection: 'CostoFija'
    }
);

module.exports = mongoose.model('CostoFija', CostoFija);