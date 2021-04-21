'use strict'

const TarifaFactor = require('../TarifaFactor/TarifaFactor.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.controller');

function get(req, res) {
    TarifaFactor.find({ statusReg: "ACTIVO" })
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
        .sort({ "fechaAlta": -1 })
        .limit(1)
        .populate({
            'path': 'cliente_id',
            'select': 'nombreCorto nombreComercial clave'
        })
        .populate({
            'path': "embalaje_id",
            'select': 'nombre clave'
        })
        .then(tarifa => {
            res.status(200).send(tarifa);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function post(req, res) {
    let nTarifa = new TarifaFactor(req.body);

    nTarifa.save()
        .then(saved => {
            res.status(201).send(saved);
        })
        .catch(error => {
            console.log(error);
            res.status(500).send(error);
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

    TarifaFactor.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } })
        .then(edited => {
            ClienteFiscal.removeTarifa(edited.cliente_id);
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