'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Sucursal = Schema({
    idSucursal: Number,
    arrClienteFiscales: [{type:Schema.ObjectId,ref:'ClienteFiscal'}],
    idUsuario: Number,
    fechaAlta: Date,
    nombre: String,
    calle: String,
    numeroExt: String,
    numeroInt: String,
    colonia: String,
    municipio: String,
    estado: String,
    cp: Number,
    statusReg: String
}, {
    collection: 'Sucursales'
});

module.exports = mongoose.model('Sucursal', Sucursal);
