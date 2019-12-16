'use strict'

const FolioInreso = require('../models/FolioIngreso');
const Helpers = require('../helpers');

async function getNextID() {
	return await Helper.getNextID(FolioInreso, "folio");
}

function get(req, res) {
    FolioInreso.find({})
        .then(folios => {
            res.status(200).send(folios);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

async function save(req, res) {
    let nFolioIngreso = new FolioInreso(req.body);

    nFolioIngreso.folio = await getNextID();

    nFolioIngreso.save()
        .then(folio => {
            res.status(201).send(folio);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

function update(req, res) {
    let _id = req.params._id;

    FolioInreso.findOneAndUpdate({ _id: _id }, { $set: req.body }, { new: true })
        .then(folio => {
            res.status(200).send(folio);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

function _delete(req, res) {
    let _id = req.params._id;

    FolioInreso.findByIdAndUpdate({ _id: _id }, { status: "BAJA" }, { new: true })
        .then(folio => {
            res.status(200).send(folio);
        })
        .catch(error => {
            res.status(500).send(error);
        })
}

module.exports = {
    get,
    save,
    update,
    _delete
}