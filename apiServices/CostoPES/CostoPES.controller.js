'use strict'

const CostoPES = require('./CostoPES.model');

function get(req, res) {
    CostoPES.find({ statusReg: "ACTIVO" })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function getById(req, res) {
    let _id = req.params._id;

    CostoPES.findOne({ _id: _id })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    let nCostoPES = new CostoPES(req.body);

    nCostoPES.save()
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function update(req, res) {
    let _id = req.params._id;

    CostoPES.updateOne({ _id: _id }, { $set: req.body })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    CostoPES.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } }, { new: true })
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