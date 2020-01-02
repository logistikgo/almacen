'use strict'

const Sucursal = require('../models/Sucursal');
const Helpers = require('../helpers');
const Interfaz_ALM_XD = require('../models/Interfaz_ALM_XD');

async function get(req, res) {
    let _arrClientesFiscales = req.query.arrClientesFiscales;

    let filtro = {
        statusReg: "ACTIVO"
    };

    if (_arrClientesFiscales != undefined && _arrClientesFiscales.length > 0)
        filtro.arrClienteFiscales = { $in: _arrClientesFiscales };

    Sucursal.find(filtro)
        .then((sucursales) => {
            res.status(200).send(sucursales);
        })
        .catch((error) => {
            return res.status(500).send({
                message: error
            });
        });
}

function getById(req, res) {
    let idSucursal = req.query.idSucursal;

    Sucursal.findOne({
        _id: idSucursal
    })
        .then((sucursal) => {
            res.status(200).send(sucursal);
        })
        .catch((error) => {
            return res.status(500).send({
                message: error
            });
        });
}

function getClientes(req, res) {
    let idSucursal = req.query.idSucursal;

    Sucursal.findOne({
        _id: idSucursal
    })
        .populate({
            path: 'arrClienteFiscales',
            model: 'ClienteFiscal'
        })
        .then((sucursal) => {
            res.status(200).send(sucursal.arrClienteFiscales);
        })
        .catch((error) => {
            return res.status(500).send({
                message: error
            });
        });
}

async function save(req, res) {
    let nSucursal = new Sucursal();
    let params = req.body;
    let IDSucursalXD = params.IDSucursalXD;
    nSucursal.idSucursal = await Helpers.getNextID(Sucursal, 'idSucursal');
    nSucursal.arrClienteFiscales = params.arrClientesFiscales;
    nSucursal.usuarioAlta_id = params.usuarioAlta_id;
    nSucursal.usuarioAlta = params.usuarioAlta;
    nSucursal.fechaAlta = new Date();
    nSucursal.nombre = params.nombre;
    nSucursal.calle = params.calle;
    nSucursal.numeroExt = params.numeroExt;
    nSucursal.numeroInt = params.numeroInt;
    nSucursal.colonia = params.colonia;
    nSucursal.municipio = params.municipio;
    nSucursal.estado = params.estado;
    nSucursal.cp = params.cp;
    nSucursal.statusReg = "ACTIVO";

    nSucursal.save()
        .then((sucursal) => {
            if (IDSucursalXD != "Ninguna") {
                let NombreSucursalXD = params.NombreSucursalXD;
                let nInterfaz = new Interfaz_ALM_XD();
                nInterfaz.nombre = NombreSucursalXD;
                nInterfaz.tipo = "Sucursal",
                    nInterfaz.alm_id = sucursal._id;
                nInterfaz.xd_id = IDSucursalXD;
                nInterfaz.save();
            }

            res.status(200).send(sucursal);
        }).
        catch((error) => {
            res.status(500).send(error);
        });
}

function update(req, res) {
    let params = req.body;
    let idSucursal = params.idSucursal;

    let item = {
        arrClienteFiscales: params.arrClientesFiscales,
        usuarioAlta_id: params.usuarioAlta_id,
        usuarioAlta: params.usuarioAlta,
        fechaAlta: new Date(),
        nombre: params.nombre,
        calle: params.calle,
        numeroExt: params.numeroExt,
        numeroInt: params.numeroInt,
        colonia: params.colonia,
        municipio: params.municipio,
        estado: params.estado,
        cp: params.cp
    };

    Sucursal.updateOne({ _id: idSucursal }, { $set: item })
        .then((sucursal) => {
            res.status(200).send(sucursal);
        })
        .catch((error) => {
            res.status(500).send(error);
        });
}

function _delete(req, res) {
    let idSucursal = req.body.idSucursal;

    Sucursal.findOne({ _id: idSucursal, statusReg: "ACTIVO" })
        .then((sucursal) => {
            sucursal.statusReg = "BAJA";
            sucursal.save()
                .then(() => {
                    res.status(200).send(sucursal);
                })
        })
        .catch((error) => {
            res.status(500).send(error);
        })
}

module.exports = {
    get,
    getById,
    getClientes,
    save,
    update,
    _delete
}
