'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FolioIngreso = Schema(
    {
        folio: String,
        cliente_id: {type: Schema.ObjectId, ref:'ClienteFiscal'},
        tarifa_id: Schema.ObjectId,
        tipoTarifa: String,
        total: Number,
        fechaInicio: Date,
        fechaFin: Date,
        statusReg:String,
        usuarioAlta: String,
		usuarioAlta_id: Number,
		fechaAlta: Date
    }
);

module.exports = mongoose.model('FolioIngreso', FoliosIngresos);