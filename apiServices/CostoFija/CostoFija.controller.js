'use strict'

const CostoFija = require('./CostoFija.model');

function get(req, res) {
    CostoFija.find({ statusReg: "ACTIVO" })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function getById(req, res) {
    let _id = req.params._id;

    CostoFija.findOne({ _id: _id })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    let nCostoFija = new CostoFija(req.body);

    nCostoFija.save()
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function update(req, res) {
    let _id = req.params._id;

    CostoFija.updateOne({ _id: _id }, { $set: req.body })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    CostoFija.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } }, { new: true })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        })
}

module.exports = {
    get,
    getById,
    save,
    update,
    _delete,
}