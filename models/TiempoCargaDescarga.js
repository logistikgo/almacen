'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TiempoCargaDescarga = Schema({
    folio: String,
    consecutivo: Number,
    tipo: String,
    inicio: Date,
    fin: Date,
    tiempo: String,
    entrada_id: { type: Schema.ObjectId, ref: "Entrada" },
    salida_id: { type: Schema.ObjectId, ref: "Salida" },
    almacen_id: { type: Schema.ObjectId, ref: 'Almacen' },
    status: { type: String, default: "SIN ASIGNAR" },
    usuarioAlta: String,
    usuarioAlta_id: Number,
    fechaAlta: { type: Date, default: Date.now },
    statusReg: { type: String, default: "ACTIVO" },
    transportista: String,
    unidad: String,
    placas: String,
    tracto: String,
    remolque: String
},
    {
        collection: 'TiempoCargaDescarga'
    });

module.exports = mongoose.model('TiempoCargaDescarga', TiempoCargaDescarga);