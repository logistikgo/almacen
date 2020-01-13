'use strict'

const TiempoCargaDescarga = require('../models/TiempoCargaDescarga');
const Helpers = require('../helpers');

async function getNextID() {
    return await Helpers.getNextID(TiempoCargaDescarga, "consecutivo");
}

function get(req, res) {
    let almacen_id = req.query.almacen_id;
    let tipo = req.query.tipo;
    let status = req.query.status;

    TiempoCargaDescarga.find({ almacen_id: almacen_id, tipo: tipo, status: { $in: status }, statusReg: "ACTIVO" })
        .then(tiempos => {
            res.status(200).send(tiempos);
        })
        .catch(error => {
            res.status(500).send(error);
        });
}

async function save(req, res) {
    let nTiempo = new TiempoCargaDescarga(req.body);

    nTiempo.consecutivo = await getNextID();
    nTiempo.folio = `${nTiempo.consecutivo}`;

    nTiempo.save()
        .then(tiempo => {
            res.status(201).send(tiempo);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

function setStatus(_id, options) {
    TiempoCargaDescarga.updateOne({ _id: _id }, { $set: options }).catch((err) => {
        console.log(err);
    });
}

function update(req, res) {

}

function _delete(req, res) {

}

module.exports = {
    get,
    save,
    setStatus,
    update,
    _delete
}