'use strict'

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClienteFiscal = require('../controllers/ClienteFiscal');

const TarifaFactor = Schema(
    {
        cliente_id: { type: Schema.ObjectId, ref: 'ClienteFiscal' },
        embalaje_id: { type: Schema.ObjectId, ref: 'Embalaje' },
        tipoCambio: String,
        factor: Number,
        usuarioAlta: String,
        usuarioAlta_id: Number,
        usuarioBaja_id: Number,
        fechaAlta: { type: Date, default: new Date() },
        fechaBaja: Date,
        statusReg: { type: String, default: "ACTIVO" }
    },
    {
        collection: 'TarifasFactor'
    }
);

var autoPopulate = function(next) {
    this.populate({
        path: 'cliente_id',
        select: 'nombreCorto nombreComercial clave'
    })
    .populate({
        path: 'embalaje_id',
        select: 'nombre clave'
    });
    next();
};

TarifaFactor.pre('find', autoPopulate);
TarifaFactor.post('save', function(doc, next) {
    doc.populate('cliente_id').populate('embalaje_id').execPopulate().then(function() {
        ClienteFiscal.setHasTarifa(doc.cliente_id);
        next();
    });
});

module.exports = mongoose.model('TarifaFactor', TarifaFactor);