'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Entrada = Schema({
},
{collection:'Entradas'}
);

module.exports = mongoose.model('Entrada', Entrada);