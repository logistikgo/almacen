'use strict'

const ClasificacionesProductos = require('../models/ClasificacionesProductos');

var arrClasificaciones = [];

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

    ClasificacionesProductos.updateOne({ _id: _id }, { $set: req.body })
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

const busquedaArr = (arreglo, busqueda, izquierda, derecha) => {
    if (izquierda > derecha)
        return -1;
    let indiceMitad = Math.floor((derecha + izquierda) / 2);
    let mitad = arreglo[indiceMitad];

    if (busqueda === mitad)
        return indiceMitad;
    else {
        if (busqueda > mitad) {
            izquierda = indiceMitad + 1
            return busquedaArr(arreglo, busqueda, izquierda, derecha);
        }
        else {
            derecha = indiceMitad - 1
            return busquedaArr(arreglo, busqueda, izquierda, derecha);
        }
    }
}

async function getValidaClasificacion(req, res) {
    let arr = req.query.subclasificacion;

    await ClasificacionesProductos.aggregate([{ $unwind: "$subclasificacion" }, { $project: { _id: 0, nombre: "$subclasificacion.nombre" } }],
        function (err, res) {
            var array = [];
            if (res) {
                res.forEach(
                    function (clasificacion) {
                        array.push(clasificacion.nombre);
                    }
                );
                array.sort();
                arrClasificaciones = array;
            }
            else
                console.log(err);
        })
    arr.forEach(element => {
        if (busquedaArr(arrClasificaciones, element.nombre, 0, arrClasificaciones.length - 1) != -1) {
            res.status(500).send("ERROR BACKEND");
        }
    })
    res.status(200).send("SUCCESS BACKEND");
}

module.exports = {
    get,
    getById,
    save,
    update,
    _delete,
    getValidaClasificacion
}