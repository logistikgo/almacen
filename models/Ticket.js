'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Ticket = Schema(
    {
        partida_id: {type: Schema.ObjectId, ref: 'Partida'},
        producto_id: { type: Schema.ObjectId, ref: 'Producto' },
        lote: String,
        fechaProduccion: Date,
        fechaCaducidad: Date,
        embalajesEntrada: {},
    },
    {
        collection: 'Tickets'
    }
);

module.exports = mongoose.model('Ticket', Ticket);