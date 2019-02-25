'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColumnasxTipoUsuario = Schema({
	tipoUsuario : String,
    idTabla : String,
    columnas: [
    {
        nombre: String,
        indice: Number
    }],
},
{ collection: 'ColumnasxTipoUsuario' });

module.exports = mongoose.model('ColumnasxTipoUsuario', ColumnasxTipoUsuario);