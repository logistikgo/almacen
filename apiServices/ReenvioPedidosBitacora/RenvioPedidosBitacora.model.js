'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReenvioPedidosBitacora = Schema(
    {
        idTicket: Number,
        sucursal_id: { type: Schema.ObjectId, ref: "Sucursal" },
	    almacen_id: { type: Schema.ObjectId, ref: "Almacen" },
	    clienteFiscal_id: { type: Schema.ObjectId, ref: "ClienteFiscal" },
        salida_id: {type: Schema.ObjectId, ref: 'Salida'},
        descripcion: String,
        tipo: String,
        fechaAlta: { type: Date, default: Date.now},
        nombreUsuario: String,
        status: String
    },
    {
        collection: 'ReenvioPedidosBitacora'
    }
);

module.exports = mongoose.model('ReenvioPedidosBitacora', ReenvioPedidosBitacora);