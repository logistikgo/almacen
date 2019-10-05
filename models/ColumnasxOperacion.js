'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColumnasxOperacion = Schema({
    clienteFiscal_id: {type:Schema.ObjectId, ref:"ClienteFiscal"},
    sucursal_id: {type: Schema.ObjectId, ref:"Sucursal"},
    almacen_id: {type: Schema.ObjectId, ref: "Almacen"},
    idTabla: String,
    columnas: [
        {
            indice: Number,
            nombre: String,
            enumeracion: String
        }
    ],
    },
    {
        collection: "ColumnasxOperacion"
    }
);

module.exports = mongoose.model('ColumnasxOperacion', ColumnasxOperacion);