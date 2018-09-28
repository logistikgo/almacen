'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Sucursal = Schema({
    idSucursal: Number,
    arrClienteFiscales: [Number],
    idUsuario: Number,
    fechaAlta: Date,
    nombre: String,
    calle: String,
    numeroExt: Number,
    numeroInt: Number,
    colonia: String,
    municipio: String,
    estado: String,
    cp: Number,
    statusReg: String
}, {
    collection: 'Sucursales'
});

module.exports = mongoose.model('Sucursal', Sucursal);
