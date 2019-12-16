'use strict'

const TarifaFactor = require('../models/TarifaFactor');

function get(req, res) {
    TarifaFactor.find({ statusReg: "ACTIVO" })
        .populate({
            'path': 'cliente_id',
            'select': 'nombreCorto nombreComercial clave'
        })
        .populate({
            path: "embalaje_id",
            select: 'nombre clave'
        })
        .then(tarifas => {
            res.status(200).send(tarifas);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function getByCliente(req, res) {
    let cliente_id = req.params.cliente_id;

    TarifaFactor.find({ cliente_id: cliente_id, statusReg: "ACTIVO" })
        .sort({ fechaAlta: -1 })
        .populate({
            path: "embalaje_id",
            select: 'nombre clave'
        })
        .then(tarifas => {
            let tarifa = tarifas.first();
            res.status(200).send(tarifas);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function post(req, res) {
    let nTarifaPES = new TarifaFactor(req.body);

    nTarifaPES.save()
        .then(saved => {
            TarifaFactor.findOne({ _id: saved._id })
                .populate({
                    path: "embalaje_id",
                    select: 'nombre clave'
                })
                .then(data => {
                    res.status(201).send(data);
                });

        })
        .catch(error => {
            req.status(500).send(error);
        });
}

function put(req, res) {
    let _id = req.params._id;

    TarifaFactor.updateOne({ _id: _id }, { $set: req.body })
        .then(edited => {
            res.status(200).send(edited);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    TarifaFactor.updateOne({ _id: _id }, { $set: { statusReg: "BAJA" } })
        .then(edited => {
            res.status(200).send(edited);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

module.exports = {
    get,
    getByCliente,
    post,
    put,
    _delete
};