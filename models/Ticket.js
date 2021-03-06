'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Ticket = Schema(
    {
        idTicket: Number,
        stringFolio: String,
        partida_id: {type: Schema.ObjectId, ref: 'Partida'},
        producto_id: { type: Schema.ObjectId, ref: 'Producto'},
        sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	    almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	    clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
        lote: String,
        fechaProduccion: Date,
        fechaCaducidad: Date,
        embalajesEntrada: {},
        entrada_id: {type: Schema.ObjectId, ref: 'Entrada'},
        salida_id: {type: Schema.ObjectId, ref: 'Salida'},
        observaciones: String,
        tipo: String,
        fechaAlta: Date,
        usuarioAlta_id: Number,
        nombreUsuario: String,
        status: String,
        usuarioAprueba_id: Number,
        nombreUsuarioAprueba: String,
        fechaLiberacion: Date,
    },
    {
        collection: 'Tickets'
    }
);

module.exports = mongoose.model('Ticket', Ticket);