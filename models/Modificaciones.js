'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const paguinate = require('mongoose-paginate-v2');
const Modificaciones = Schema(
    {
        idTicket: Number,
        stringFolio: String,
        partida_id: {type: Schema.ObjectId, ref: 'Partida'},
        producto_id: { type: Schema.ObjectId, ref: 'Producto'},
        sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	    almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	    clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
        fechaProduccionAnterior: Date,
        fechaProduccionModificada: Date,
        fechaCaducidadAnterior: Date,
        fechaCaducidadModificada: Date,
        loteAnterior: String,
        loteModificado: String,
        embalajesAnteriores: {},
        embalajesModificados: {},
        ubicacionAnterior: {},
        ubicacionModificada: {},
        entrada_id: {type: Schema.ObjectId, ref: 'Entrada'},
        salida_id: {type: Schema.ObjectId, ref: 'Salida'},
        observaciones: String,
        tipo: String,
        fechaAlta: { type: Date, default: Date.now},
        usuarioAlta_id: Number,
        nombreUsuario: String,
        status: String,
        ubicacionAnterior:String,
        ubicacionModificada: String
    },
    {
        collection: 'Modificaciones'
    }
);

Modificaciones.plugin(paguinate);

module.exports = mongoose.model('Modificaciones', Modificaciones);