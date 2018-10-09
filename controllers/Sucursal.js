'use strict'

const Sucursal = require('../models/Sucursal');
const Helpers = require('../helpers');

function get(req, res) {
    let idCteFiscal = parseInt(req.query.idCteFiscal);

    Sucursal.find({
            arrClienteFiscales: idCteFiscal,
            statusReg: "ACTIVO"
        })
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
    let idSucursal = parseInt(req.query.idSucursal);

    Sucursal.findOne({
            idSucursal: idSucursal
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

async function save(req, res){
    let nSucursal = new Sucursal();
    let params = req.body;

    nSucursal.idSucursal = await Helpers.getNextID(Sucursal, 'idSucursal');
    nSucursal.arrClienteFiscales = params.arrClientesFiscales;
    nSucursal.idUsuario = params.idUsuario;
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
    .then((sucursal)=>{
        res.status(200).send({sucursal});
    })
    .catch(err=>console.log(err));
}

function update(req, res){
    let params = req.body;
    let idSucursal = params.idSucursal;

    let item = {
        arrClienteFiscales: params.arrClientesFiscales,
        idUsuario: params.idUsuario,
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

    Sucursal.updateOne({idSucursal: idSucursal}, {$set:item})
    .then((sucursal)=>{
        res.status(200).send(sucursal);
    })
    .catch((error)=>{
        res.status(500).send(error);
    })

}

function _delete(req, res){
    let idSucursal = req.body.idSucursal;

    Sucursal.findOne({idSucursal:idSucursal, statusReg: "ACTIVO"})
    .then((sucursal) => {
        sucursal.statusReg = "BAJA";
        sucursal.save()
        .then(()=>{
            res.status(200).send(sucursal);
        })
    })
    .catch((error)=>{
        res.status(500).send(error);
    })
}

module.exports = {
    get,
    getById,
    save,
    update,
    _delete
}
