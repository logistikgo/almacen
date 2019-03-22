'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ColumnasxTipoUsuario = Schema({
	tipoUsuario : String,
    idTabla : String,
    columnas: [
    {
    	indice: Number,
        nombre: String,
        enumeracion: String
    }],
},
{ collection: 'ColumnasxTipoUsuario' });

module.exports = mongoose.model('ColumnasxTipoUsuario', ColumnasxTipoUsuario);