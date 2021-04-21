'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CostoDXP = Schema(
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
        precioPorDia: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: { type: Date },
        statusReg: { type: String, default: "ACTIVO" },
    },
    {
        collection: 'CostoDXP'
    }
);

module.exports = mongoose.model('CostoDXP', CostoDXP);