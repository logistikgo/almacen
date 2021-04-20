'use strict'

const CostoDXP = require('./CostoDXP.model');

function get(req, res) {
    CostoDXP.find({ statusReg: "ACTIVO" })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function getById(req, res) {
    let _id = req.params._id;

    CostoDXP.findOne({ _id: _id })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    let nCostoDXP = new CostoDXP(req.body);

    nCostoDXP.save()
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function update(req, res) {
    let _id = req.params._id;

    CostoDXP.updateOne({ _id: _id }, { $set: req.body })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    CostoDXP.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } }, { new: true })
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