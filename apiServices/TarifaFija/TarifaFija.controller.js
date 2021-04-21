'use strict'

const TarifaFija = require('./TarifaFija.model');
const ClienteFiscal = require('../ClientesFiscales/ClienteFiscal.controller');

function get(req, res) { 
    TarifaFija.find({ statusReg: "ACTIVO" })
        .populate({
            'path': 'cliente_id',
            'select': 'nombreCorto nombreComercial clave'
        })
        .populate({
            'path': 'almacen_id',
            'select': 'nombre'
        })
        .then(data => {
            console.log(data);
            res.status(200).send(data);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function getByID(req, res) {
    let _id = req.params._id;
    TarifaFija.findOne({_id: _id, statusReg: "ACTIVO" })
        .populate({
            'path': 'cliente_id',
            'select': 'nombreCorto nombreComercial clave'
        })
        .then(data => {
            res.status(200).send(data);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function getByCliente(req, res) {
    console.log(req)
    let cliente_id = req.query.cliente_id;
    let tipo = req.query.tipo;

    TarifaFija.find({ cliente_id: cliente_id,tipo:tipo, statusReg: "ACTIVO" })
        .sort({ "fechaAlta": -1 })
        .then(tarifa => {
            res.status(200).send(tarifa);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    let newTarifaFija = new TarifaFija(req.body);

    newTarifaFija.fechaAlta = new Date();
    newTarifaFija.save()
        .then(saved => {
            res.status(200).send(saved);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let delete_id = req.params._id;
    TarifaFija.findOneAndUpdate({ _id: delete_id }, { $set: { statusReg: "BAJA" } })
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
    save,
    _delete
}