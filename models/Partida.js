'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Partida = Schema(
    {
        entrada_id : {type:Schema.ObjectId,ref:'Entrada'},
        salidas_id : 
        [ 
            {
                salida_id: {type:Schema.ObjectId,ref:'Salida'},
                embalajes: {}
            }
        ],
        embalajesEntrada : {},
        embalajesxSalir : {},
        posiciones: [
            {
                embalajesEntrada: {},
                embalajesxSalir: {},
                posicion_id: {type:Schema.ObjectId,ref:'Posicion'},
                pasillo_id : {type:Schema.ObjectId,ref:'Pasillo'},
                nivel: {type:Schema.ObjectId}
            }

        ],
        status: String

    },
    {
        collection: 'Partidas'
    });

module.exports = mongoose.model("Partida",Partida);