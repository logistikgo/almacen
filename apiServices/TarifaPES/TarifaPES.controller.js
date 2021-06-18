'use strict'

const TarifaPES = require('./TarifaPES.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.controller');

function get(req, res) {
    TarifaPES.find({statusReg: "ACTIVO" })
        .then(tarifas => {
            res.status(200).send(tarifas);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function getByID(req, res) {
    let _id = req.params._id;
    TarifaPES.findOne({_id: _id, statusReg: "ACTIVO" })
        .then(tarifas => {
            res.status(200).send(tarifas);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function getByCliente(req, res) {
    let cliente_id = req.params.cliente_id;

    TarifaPES.find({cliente_id: cliente_id, statusReg: "ACTIVO" })
        .sort({"fechaAlta":-1})
        .limit(1)
        .then(tarifa => {
            res.status(200).send(tarifa);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function post(req, res) {
    let nTarifaPES = new TarifaPES(req.body);

    nTarifaPES.save()
        .then(saved => {
            res.status(200).send(saved);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}


function put(req, res) {
    let _id = req.params._id;

    TarifaPES.updateOne({ _id: _id }, { $set: req.body })
        .then(edited => {
            res.status(200).send(edited);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    TarifaPES.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } }, { new: true })
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
    getByID,
    getByCliente,
    post,
    put,
    _delete
};