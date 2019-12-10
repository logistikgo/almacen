'use strict'

const TarifaDXP = require('../models/TarifaDXP');

function get (req, res) {
    let cliente_id = req.params.cliente_id;

    TarifaDXP.find({cliente_id: cliente_id, statusReg: "ACTIVO"})
    .then(data => {
        res.status(200).send(data);
    })
    .catch(error => {
        res.status(500).send(error);
    });
}

function save (req, res) {
    let nTarifaDXP = new TarifaDXP(req.body);

    nTarifaDXP.fechaAlta = new Date();
    nTarifaDXP.save()
    .then(saved => {
        res.status(200).send(saved);
    })
    .catch(error => {
        res.status(500).send(error);
    });
}

module.exports = {
    get,
    save
}