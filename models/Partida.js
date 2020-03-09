'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Partida = Schema(
    {
        producto_id: { type: Schema.ObjectId, ref: 'Producto' },
        clave: String,
        descripcion: String,
        entrada_id: { type: Schema.ObjectId, ref: 'Entrada' },
        lote: String,
        fechaProduccion: Date,
        fechaCaducidad: Date,
        valor: { type: Number, default: 0 },
        salidas_id:
            [
                {
                    salida_id: { type: Schema.ObjectId, ref: 'Salida' },
                    embalajes: {},
                    salidaxPosiciones: [{
                        embalajes: {},
                        posicion_id: { type: Schema.ObjectId, ref: 'Posicion' },
                        posicion: String,
                        pasillo_id: { type: Schema.ObjectId, ref: 'Pasillo' },
                        pasillo: String,
                        nivel_id: { type: Schema.ObjectId },
                        nivel: String
                    }]
                }
            ],
        posiciones: [
            {
                embalajesEntrada: {},
                embalajesxSalir: {},
                posicion_id: { type: Schema.ObjectId, ref: 'Posicion' },
                posicion: String,
                pasillo_id: { type: Schema.ObjectId, ref: 'Pasillo' },
                pasillo: String,
                nivel_id: { type: Schema.ObjectId },
                nivel: String,
                isEmpty: { type: Boolean, default: false }
            }
        ],
        embalajesEntrada: {},
        embalajesxSalir: {},
        embalajesAlmacen: {},
        InfoPedidos: [
            {
                IDPedido: Number,
                Delivery: String,
                ClienteOrigen: String,
                ClienteFinal: String,
                ClienteFiscal: String,
                FechaAlta: Date,
                FechaETA: Date,
                Tarimas: Number,
                Piezas: Number,
                Cajas: Number,
                CrossDock: String,
                Sucursal: String,
                embalajes: {},
                embalajesEnSalidasxPosicion: {},
                status: { type: String, default: "PENDIENTE" }
            }
        ],
        isEmpty: { type: Boolean, default: false },
        origen: { type: String, default: "ALM" },
        tipo: { type: String, default: "NORMAL" },
        status: { type: String, default: "ASIGNADA" }
    },
    {
        collection: 'Partidas'
    });

    // var autoPopulateProducto = function(next) {
    //     this.populate({
    //         path: 'producto_id',
    //         select: 'clave descripcion clasificacion clasificacion_id subclasificacion subclasificacion_id vidaAnaquel garantiaFrescura alertaAmarilla alertaRoja'
    //     });
    //     next();
    // };
    
    // Partida.pre('find', autoPopulateProducto);

    // Partida.post('save', function(doc, next) {
    //     doc.populate('producto_id').execPopulate().then(function(){
    //         next();
    //     });
    // });

module.exports = mongoose.model("Partida", Partida);