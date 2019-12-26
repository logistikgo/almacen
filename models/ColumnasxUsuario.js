'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColumnasxUsuario = Schema(
    {
        idUsuario: Number,
        idTabla: String,
        columnas: [
            {
                indice: Number,
                nombre: String,
                enumeracion: String
            }],
    },
    { collection: 'ColumnasxUsuario' });

module.exports = mongoose.model('ColumnasxUsuario', ColumnasxUsuario);