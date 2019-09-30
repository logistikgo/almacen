'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Partida = Schema(
    {
        producto_id: {type:Schema.ObjectId,ref:'Producto'},
        clave : String,
        descripcion: String,
        entrada_id : {type:Schema.ObjectId,ref:'Entrada'}, 
        salidas_id : 
        [ 
            {
                salida_id: {type:Schema.ObjectId,ref:'Salida'},
                embalajes: {},
                salidaxPosiciones: [{
                    embalajes: {},
                    posicion_id: {type:Schema.ObjectId,ref:'Posicion'},
                    posicion: String,
                    pasillo_id : {type:Schema.ObjectId,ref:'Pasillo'},
                    pasillo:String,
                    nivel_id: {type:Schema.ObjectId},
                    nivel:String
                }]
            }
        ],
        posiciones: [
            {
                embalajesEntrada: {},
                embalajesxSalir: {},
                posicion_id: {type:Schema.ObjectId,ref:'Posicion'},
                posicion: String,
                pasillo_id : {type:Schema.ObjectId,ref:'Pasillo'},
                pasillo:String,
                nivel_id: {type:Schema.ObjectId},
                nivel:String,
                isEmpty : { type: Boolean, default: false }
            }
        ],
        embalajesEntrada : {},
        embalajesxSalir : {},
        embalajesAlmacen : {},
        lote: String,
        valor: { type: Number, default: 0 },
        InfoPedidos: [
            {
                IDPedido : Number,
                Delivery : String,
                ClienteOrigen : String,
                ClienteFinal : String,
                ClienteFiscal : String,
                FechaAlta : Date,
                FechaETA : Date,
                Tarimas : Number,
                Piezas : Number,
                Cajas : Number,
                CrossDock : String,
                Sucursal : String,
                embalajes : {},
                embalajesEnSalidasxPosicion : {},
                status : { type: String,default : "PENDIENTE"}
            }
        ],
        isEmpty: { type: Boolean, default: false },
        origen : { type: String, default: "ALM" },
        tipo: { type: String, default: "NORMAL" },
        status : { type: String, default: "ASIGNADA" }
    },
    {
        collection: 'Partidas'
    });

module.exports = mongoose.model("Partida",Partida);