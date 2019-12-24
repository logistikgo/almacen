'use strict'

const TarifaDXP = require('../models/TarifaDXP');

function get(req, res) {
    TarifaDXP.find({ statusReg: "ACTIVO" })
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
    let cliente_id = req.params.cliente_id;

    TarifaDXP.find({ cliente_id: cliente_id, statusReg: "ACTIVO" })
        .sort({ "fechaAlta": -1 })
        .limit(1)
        .populate({
            'path': 'cliente_id',
            'select': 'nombreCorto nombreComercial clave'
        })
        .then(tarifa => {
            res.status(200).send(tarifa);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function save(req, res) {
    let nTarifaDXP = new TarifaDXP(req.body);
    
    nTarifaDXP.save()
        .then(saved => {
            res.status(200).send(saved);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let delete_id = req.params._id;
    TarifaDXP.findOneAndUpdate({ _id: delete_id }, { $set: { statusReg: "BAJA" } })
        .then(edited => {
            res.status(200).send(edited)
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

module.exports = {
    get,
    getByCliente,
    save,
    _delete
}