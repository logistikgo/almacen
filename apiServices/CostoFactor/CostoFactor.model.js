'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CostoFactor = Schema(
    {
        proveedor_id: { 
            type: Schema.ObjectId 
            //ref: 'ClienteFiscal' 
        },
        almacen_id: {
            type: Schema.ObjectId,
            ref: 'Almacen'
        },
        embalaje_id: { type: Schema.ObjectId, ref: 'Embalaje' },
        tipoCambio: String,
        factor: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        usuarioBaja_id: Number,
        fechaAlta: { type: Date, default: new Date() },
        fechaBaja: Date,
        statusReg: { type: String, default: "ACTIVO" }
    },
    {
        collection: 'CostoFactor'
    }
);

module.exports = mongoose.model('CostoFactor', CostoFactor);