'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TiempoCargaDescarga = Schema({
    folio: String,
    consecutivo: Number,
    tipo: String,
    tiempo: String,
    almacen_id: {type: Schema.ObjectId, ref: 'Almacen'},
    status: { type: String, default: "SIN TIEMPO" },
    usuarioAlta: String,
    usuarioAlta_id: Number,
    fechaAlta:  { type: Date, default: Date.now },
    statusReg: { type: String, default: "ACTIVO" }
},
{
    collection: 'TiempoCargaDescarga'
});

module.exports = mongoose.model('TiempoCargaDescarga', TiempoCargaDescarga);