'use strict'

const TiempoCargaDescarga = require('../models/TiempoCargaDescarga');

function get(req, res) {
    let almacen_id = req.params.almacen_id;
    let tipo = req.params.tipo;

    TiempoCargaDescarga.find({almacen_id: almacen_id, tipo: tipo, statusReg: "ACTIVO"})
    .then(tiempos => {
        res.status(200).send(tiempos);
    })
    .catch(error => {
        res.status(500).send(error);
    });
}

async function save(req, res) {

}

function update(req, res) {

}

function _delete(req, res) {

}

module.exports = {
    get,
    save,
    update,
    _delete
}