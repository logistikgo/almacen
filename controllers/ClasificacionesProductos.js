'use strict'

const ClasificacionesProductos = require('../models/ClasificacionesProductos');

function get(req, res) {
    ClasificacionesProductos.find({ statusReg: "ACTIVO" })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function getById(req, res) {
    let _id = req.params._id;

    ClasificacionesProductos.findOne({ _id: _id })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    req.body.fechaAlta = new Date();
    
    let nClasificacion = new ClasificacionesProductos(req.body);

    nClasificacion.save()
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function update(req, res) {
    let _id = req.params._id;

    ClasificacionesProductos.updateOne({ _id: _id}, { $set: req.body })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let _id = req.params._id;

    ClasificacionesProductos.findOneAndUpdate({ _id: _id }, { $set: { statusReg: "BAJA" } }, { new: true })
        .then((data) => {
            res.status(200).send(data);
        })
        .catch((error) => {
            res.status(500).send(error);
        })
}

module.exports ={
    get,
    getById,
    save,
    update,
    _delete
}