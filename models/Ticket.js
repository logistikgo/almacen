'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Ticket = Schema(
    {
        partida_id: {type: Schema.ObjectId, ref: 'Partida'},
        producto_id: { type: Schema.ObjectId, ref: 'Producto'},
        lote: String,
        fechaProduccion: Date,
        fechaCaducidad: Date,
        embalajesEntrada: {},
        entrada_id: {type: Schema.ObjectId, ref: 'Entrada'},
        salida_id: {type: Schema.ObjectId, ref: 'Salida'},
        observaciones: String
    },
    {
        collection: 'Tickets'
    }
);

module.exports = mongoose.model('Ticket', Ticket);