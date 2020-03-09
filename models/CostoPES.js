'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CostoPES = Schema(
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
        precioPosicion: Number,
        precioEntrada: Number,
        precioSalida: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        usuarioBaja_id: Number,
        fechaAlta: { type: Date, default: new Date() },
        fechaBaja: Date,
        statusReg: { type: String, default: "ACTIVO" },
    },
    {
        collection: 'CostoPES'
    }
);

module.exports = mongoose.model('CostoPES', CostoPES);
