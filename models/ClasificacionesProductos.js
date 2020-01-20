'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClasificacionesProductos = Schema(
    {
        nombre: String,
        subclasificacion: [{
            nombre: String,
        }],
        usuarioAlta: String,
        usuarioAlta_id: Number,
        fechaAlta: { type: Date, default: Date.now },
        usuarioBaja_id: Number,
        fechaBaja: Date,
        statusReg: { type: String, default: "ACTIVO" }
    },
    {
        collection: "ClasificacionesProductos"
    });

module.exports = mongoose.model("ClasificacionesProductos", ClasificacionesProductos);