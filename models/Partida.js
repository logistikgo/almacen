'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Partida = Schema(
    {
        producto_id: {type:Schema.ObjectId,ref:'Producto'},
        entrada_id : {type:Schema.ObjectId,ref:'Entrada'},
        salidas_id : 
        [ 
            {
                salida_id: {type:Schema.ObjectId,ref:'Salida'},
                embalajes: {}
            }
        ],
        posiciones: [
            {
                embalajesEntrada: {},
                embalajesxSalir: {},
                posicion_id: {type:Schema.ObjectId,ref:'Posicion'},
                pasillo_id : {type:Schema.ObjectId,ref:'Pasillo'},
                nivel: {type:Schema.ObjectId}
            }

        ],
        embalajesEntrada : {},
        embalajesxSalir : {},
        pesoBruto : Number,
        pesoNeto: Number,
        pesoBrutoxSalir : Number,
        pesoNetoxSalir : Number,
        lote: String,
        valor: Number,
        IDPedido: Number,
        InfoPedido: {},
        isEmpty: { type: Boolean, default: false },
        status: String

    },
    {
        collection: 'Partidas'
    });

module.exports = mongoose.model("Partida",Partida);